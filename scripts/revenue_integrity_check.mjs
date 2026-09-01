// 무료 발급과 유료 결제가 제대로 분리돼 있는지 본다 — 매출 원장은 포트원이다.
//   npm run check:revenue
//   npm run check:revenue -- --from 2026-01-01
//
// 왜 필요한가: subscriptions 테이블에는 무료 발급(amount=0, order_id가 admin-grant-…)이
// 섞여 있어 이 테이블로 매출을 세면 과대 계상된다. 돈의 사실은 포트원 원장에만 있으므로,
// 유료 구독 행과 원장 결제건을 order_id↔결제 id로 직접 대조해 어긋난 행을 찾는다.
//
// 읽기 전용이다 — DB 쓰기·포트원 파괴적 호출 없음. 개인정보는 출력하지 않고 id 앞 8자만.
import fs from 'node:fs'
import { PortOneClient } from '@portone/server-sdk'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)

const argv = process.argv.slice(2)
const FROM = (argv.includes('--from') && argv[argv.indexOf('--from') + 1]) ? argv[argv.indexOf('--from') + 1] : '2026-01-01'
if (!/^\d{4}-\d{2}-\d{2}$/.test(FROM)) {
  console.error(`날짜 형식이 아니다: ${FROM} (YYYY-MM-DD)`)
  process.exit(1)
}
const fromIso = new Date(`${FROM}T00:00:00+09:00`).toISOString()

const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const KEY = ENV.SUPABASE_SERVICE_ROLE_KEY

// PostgREST는 한 번에 1000행만 준다(limit을 크게 줘도 조용히 잘린다). Range로 넘긴다.
async function all(path) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${SB}/rest/v1/${path}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
    })
    const rows = await res.json()
    if (!Array.isArray(rows)) throw new Error(`${path.split('?')[0]} 조회 실패: ${JSON.stringify(rows).slice(0, 140)}`)
    out.push(...rows)
    if (rows.length < 1000) return out
  }
}

const subs = await all(
  `subscriptions?select=id,user_id,order_id,amount,status,started_at&started_at=gte.${fromIso}&order=started_at`,
)

const client = PortOneClient({ secret: ENV.PORTONE_API_SECRET })
const payments = []
for (let page = 0; ; page++) {
  const res = await client.payment.getPayments({
    page: { number: page, size: 100 },
    filter: { storeId: ENV.NEXT_PUBLIC_PORTONE_STORE_ID, from: fromIso, until: new Date().toISOString() },
  })
  const got = res?.items ?? []
  payments.push(...got)
  if (got.length < 100) break
}

// 원장에서 '돈이 실제로 오간 건'만 본다. 환불(CANCELLED)도 결제는 일어났던 것이므로
// 구독 행이 있어야 정상이다. READY·FAILED는 발급 대상이 아니다.
const ledger = payments.filter(
  (p) => p.paidAt && (p.status === 'PAID' || p.status === 'PARTIAL_CANCELLED' || p.status === 'CANCELLED'),
)
const ledgerById = new Map(ledger.map((p) => [p.id, p]))

const free = subs.filter((s) => (s.amount ?? 0) === 0)
const paid = subs.filter((s) => (s.amount ?? 0) > 0)
const paidByOrderId = new Map(paid.map((s) => [s.order_id, s]))
const subOrderIds = new Set(subs.map((s) => s.order_id))

const id8 = (v) => String(v ?? '-').slice(0, 8)
const kst = (t) => (t ? new Date(t).toISOString().replace('T', ' ').slice(0, 16) + 'Z' : '-')

// 어긋남 세 가지:
// ① 유료 구독인데 원장에 그 결제가 없다 — 돈 없이 이용권이 나갔거나 order_id가 깨졌다
// ② 원장 결제인데 구독 행이 없다 — 돈은 받았는데 발급이 누락됐다
// ③ 무료(amount=0)로 기록됐는데 order_id가 원장 결제와 일치한다 — 돈 냈는데 무료로 잡혔다
// 확인된 예외(2026-09-01 대조): 개발 초기(6월) 수기 처리분. 매출이 아님을 계정으로
// 확인했다 — 새 불일치는 계속 잡혀야 하므로 '무엇이·왜'를 여기 명시해 그 건만 거른다.
const KNOWN_EXCEPTIONS = {
  // 화면 출력이 8자 잘림이라 접두사로 맞춘다(계정으로 실체 확인 완료).
  subOrderPrefixes: [
    'sub_a336', // 운영자 본인 계정(lixcksunho@) 6/1 수동 발급 5,000원 — 시험 발급, 원장 결제 없음이 정상
    'demo-pro', // 시연 계정(demo-promo@kptest.cloud) 6/21 데모 이용권 — 매출 아님
  ],
  // 결제 쪽은 id 접두사 + 반드시 CANCELLED일 것 — 취소가 아닌데 구독이 없으면 여전히 잡힌다.
  paymentPrefixes: ['sub-44e3', 'sub-c0ba'], // 6/11·6/12 결제 후 전액 취소 — 발급 전 환불(개통 초기 수기 처리)
}
const isKnownCancelled = (p) =>
  p.status === 'CANCELLED' && KNOWN_EXCEPTIONS.paymentPrefixes.some((x) => String(p.id).startsWith(x))
const paidNoLedger = paid.filter((s) => !ledgerById.has(s.order_id) && !KNOWN_EXCEPTIONS.subOrderPrefixes.some((x) => String(s.order_id).startsWith(x)))
const ledgerNoSub = ledger.filter((p) => !subOrderIds.has(p.id) && !isKnownCancelled(p))
const freeButPaid = free.filter((s) => ledgerById.has(s.order_id))

console.log(`\n무료 발급 / 유료 결제 분리 검증 (${FROM} ~ 오늘)\n`)
console.log(`  subscriptions: ${subs.length}행 = 무료 발급 ${free.length}건 + 유료 ${paid.length}건`)
console.log(`  포트원 원장:   결제 ${ledger.length}건 (전체 ${payments.length}건 중 READY·FAILED 제외)`)

const problems = paidNoLedger.length + ledgerNoSub.length + freeButPaid.length
if (!problems) {
  console.log(`\n일치 ✓ (유료 구독 ${paid.length}건 ↔ 원장 결제 ${ledger.length}건, order_id 전건 대응)`)
} else {
  if (paidNoLedger.length) {
    console.log(`\n  × 유료 구독인데 원장에 결제가 없음 ${paidNoLedger.length}건`)
    for (const s of paidNoLedger) {
      console.log(`      sub=${id8(s.id)} user=${id8(s.user_id)} order=${id8(s.order_id)} ${s.amount}원 ${s.status} ${kst(s.started_at)}`)
    }
  }
  if (ledgerNoSub.length) {
    console.log(`\n  × 원장에 결제가 있는데 구독 행이 없음 ${ledgerNoSub.length}건 — 발급 누락 가능성`)
    for (const p of ledgerNoSub) {
      console.log(`      payment=${id8(p.id)} ${p.amount?.total ?? '?'}원 ${p.status} ${kst(p.paidAt)}`)
    }
  }
  if (freeButPaid.length) {
    console.log(`\n  × 무료(amount=0)로 기록됐는데 원장에 결제가 있음 ${freeButPaid.length}건 — 매출 과소 계상`)
    for (const s of freeButPaid) {
      console.log(`      sub=${id8(s.id)} user=${id8(s.user_id)} order=${id8(s.order_id)} ${s.status} ${kst(s.started_at)}`)
    }
  }
  console.log(`\n불일치 ${problems}건`)
  process.exitCode = 1
}
