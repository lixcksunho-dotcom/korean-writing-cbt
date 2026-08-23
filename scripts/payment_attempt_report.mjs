// 결제창까지 온 사람이 실제로 돈을 냈는지 본다.
//   npm run report:payments
//   npm run report:payments -- --from 2026-06-01
//
// 왜 필요한가: '결제 시도 25건 중 6건 성공(24%)'처럼 건 단위로 세면 결제창이 고장 난 것처럼
// 보인다. 실제로는 한 사람이 몇 초 간격으로 창을 두세 번 열고 마지막에 결제한다.
// 사람 단위로 세야 어디서 돈이 새는지가 보인다. 두 숫자를 같이 낸다.
//
// 실패 사유는 지어내지 않고 포트원이 준 값(failure.reason)을 그대로 쓴다.
// READY로 남은 건에는 사유가 없다 — 결제창을 열고 그냥 닫으면 PG가 아무것도 안 남긴다.
import fs from 'node:fs'
import { PortOneClient } from '@portone/server-sdk'
import { summarizeAttempts } from '../src/lib/paymentAttemptFunnel.ts'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)

const argv = process.argv.slice(2)
const FROM = argv.includes('--from') ? argv[argv.indexOf('--from') + 1] : '2026-01-01'

const client = PortOneClient({ secret: ENV.PORTONE_API_SECRET })
const storeId = ENV.NEXT_PUBLIC_PORTONE_STORE_ID

const items = []
for (let page = 0; ; page++) {
  const res = await client.payment.getPayments({
    page: { number: page, size: 100 },
    filter: { storeId, from: new Date(`${FROM}T00:00:00+09:00`).toISOString(), until: new Date().toISOString() },
  })
  const got = res?.items ?? []
  items.push(...got)
  if (got.length < 100) break
}

// 지금 회원인 사람의 시도만 센다 — 탈퇴·검증 계정이 섞이면 '안 낸 사람'이 부풀고,
// 정작 연락할 수 있는 사람이 몇 명인지가 흐려진다(관리자 화면도 같은 규칙).
const userRes = await fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
  headers: { apikey: ENV.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}` },
})
const memberIds = new Set(((await userRes.json())?.users ?? []).map((u) => u.id))
const dropped = items.filter((p) => !memberIds.has(p.customer?.id ?? p.customer?.customerId ?? ''))
if (dropped.length) console.log(`(탈퇴·검증 계정 ${dropped.length}건 제외)`)

const rows = items.filter((p) => memberIds.has(p.customer?.id ?? p.customer?.customerId ?? '')).map((p) => ({
  id: p.id,
  status: p.status,
  customerId: p.customer?.id ?? p.customer?.customerId ?? null,
  requestedAt: p.requestedAt ?? null,
  paidAt: p.paidAt ?? null,
  failureReason: p.failure?.reason ?? null,
}))

const f = summarizeAttempts(rows)
const pct = (r) => `${Math.round(r * 1000) / 10}%`
const kst = (t) => (t ? new Date(t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-')

console.log(`\n결제 시도 (${FROM} ~ 오늘)`)
console.log(`  건 단위   ${f.attempts.paid}/${f.attempts.total}건 완결 (${pct(f.attempts.ratio)})`)
console.log(`  사람 단위 ${f.people.paid}/${f.people.total}명 완결 (${pct(f.people.ratio)})   ← 이쪽이 진짜 완결률`)

if (f.retriedThenPaid.length) {
  console.log(`\n여러 번 시도한 끝에 결제한 사람 ${f.retriedThenPaid.length}명`)
  for (const p of f.retriedThenPaid) {
    console.log(`  ${p.customerId.slice(0, 8)}  ${p.attempts}번 시도 → ${p.secondsToPay}초 만에 결제  [${p.statuses.join(' → ')}]`)
  }
  console.log('  * 몇 초~몇 분 안에 끝났으면 결제수단을 바꿔 본 것이고, 오래 걸렸으면 뭔가에 막힌 것이다.')
}

if (f.droppedPeople.length) {
  console.log(`\n결제창까지 왔는데 안 낸 사람 ${f.droppedPeople.length}명 (여기가 매출 누수)`)
  for (const p of f.droppedPeople) {
    // 포트원 목록은 최신이 먼저다 — 그냥 첫 행을 쓰면 '마지막 시도'를 첫 시도로 적게 된다.
    const mine = rows
      .filter((r) => (r.customerId || `payment:${r.id}`) === p.customerId)
      .sort((a, b) => (Date.parse(a.requestedAt ?? '') || 0) - (Date.parse(b.requestedAt ?? '') || 0))
    const reasons = [...new Set(mine.map((r) => r.failureReason).filter(Boolean))]
    const span = mine.length > 1 ? ` ~ ${kst(mine.at(-1).requestedAt)}` : ''
    console.log(
      `  ${p.customerId.slice(0, 8)}  ${p.attempts}번 시도  [${p.statuses.join(' → ')}]  ` +
      `${kst(mine[0]?.requestedAt)}${span}` +
      `${reasons.length ? `  사유: ${reasons.join(' / ')}` : '  사유 없음(창을 열고 그냥 닫음)'}`,
    )
  }
}

console.log('\n실패 사유(포트원 기록)')
if (!f.failureReasons.length) console.log('  없음 — 실패로 끝난 건이 없다(READY로 남은 건에는 사유가 안 남는다)')
for (const r of f.failureReasons) console.log(`  ${r.count}건  ${r.reason}`)

const noReason = rows.filter((r) => r.status === 'READY').length
if (noReason) {
  console.log(`\nREADY로 남은 건 ${noReason}건 — 결제창은 열렸는데 PG에 아무 결과도 안 남았다.`)
  console.log('  브라우저에서 창을 닫으면 이렇게 된다. 닫힌 이유는 화면 쪽 payment_fail 이벤트로만 알 수 있다.')
}
