// 환불된 결제인데 이용권이 살아 있는 건을 찾아 회수한다(웹훅이 놓친 것의 안전망).
//   npm run audit:refunds            — 찾기만 한다(기본, 아무것도 바꾸지 않는다)
//   npm run audit:refunds -- --apply — 실제로 회수한다
//   npm run audit:refunds -- --from 2026-01-01
//
// 왜 필요한가: 취소 웹훅은 재시도 5회(약 4.5시간) 뒤 영영 사라진다. 그때 놓친 건은
// 아무도 모르는 채로 남는다 — 환불받은 사람이 30일을 계속 쓴다. 실제로 2026-06-19
// 결제가 그렇게 남아 있었다(취소 웹훅을 처리하는 코드 자체가 없던 시절).
// 포트원(돈의 원장)과 우리 DB를 직접 대조하는 쪽이 사고를 확실히 끝낸다.
//
// 판정은 화면·웹훅과 같은 순수 함수를 쓴다(subscriptionRevocationPolicy).
import fs from 'node:fs'
import { PortOneClient } from '@portone/server-sdk'
import { ACTIVE, REVOKED, decideRevocation } from '../src/lib/subscriptionRevocationPolicy.ts'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)

const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const FROM = (argv[argv.indexOf('--from') + 1] && argv.includes('--from')) ? argv[argv.indexOf('--from') + 1] : '2026-01-01'

const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const KEY = ENV.SUPABASE_SERVICE_ROLE_KEY
const db = (p, init) => fetch(`${SB}/rest/v1/${p}`, {
  ...init,
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
})

const client = PortOneClient({ secret: ENV.PORTONE_API_SECRET })
const storeId = ENV.NEXT_PUBLIC_PORTONE_STORE_ID

// 포트원 목록은 한 번에 최대 100건 → 끝까지 넘긴다(조용히 잘리면 옛 환불건을 통째로 놓친다).
const payments = []
for (let page = 0; ; page++) {
  const res = await client.payment.getPayments({
    page: { number: page, size: 100 },
    filter: { storeId, from: new Date(`${FROM}T00:00:00+09:00`).toISOString(), until: new Date().toISOString() },
  })
  const items = res?.items ?? []
  payments.push(...items)
  if (items.length < 100) break
}

// 환불이 일어난 건만 본다. 나머지(READY·FAILED·PAID)는 발급 쪽 일이다.
const refunded = payments.filter((p) => p.status === 'CANCELLED' || p.status === 'PARTIAL_CANCELLED')
console.log(`포트원 결제 ${payments.length}건 (${FROM}~) · 환불 ${refunded.length}건`)

const rows = []
for (const p of refunded) {
  const res = await db(`subscriptions?select=id,user_id,status,expires_at&order_id=eq.${encodeURIComponent(p.id)}`)
  const found = await res.json()
  if (!Array.isArray(found)) throw new Error(`구독 조회 실패: ${JSON.stringify(found).slice(0, 200)}`)
  const sub = found[0] ?? null
  rows.push({ payment: p, sub, decision: decideRevocation({ paymentStatus: p.status, subscription: sub }) })
}

const toRevoke = rows.filter((r) => r.decision.action === 'revoke')
const toReview = rows.filter((r) => r.decision.action === 'review')

const kst = (t) => (t ? new Date(t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-')
for (const r of rows) {
  const live = r.sub && r.sub.status === ACTIVE && new Date(r.sub.expires_at) > new Date()
  console.log(
    `  ${r.decision.action.padEnd(16)} ${r.payment.id}  ${kst(r.payment.paidAt ?? r.payment.requestedAt)}  ` +
    `이용권=${r.sub ? r.sub.status : '없음'}${live ? ' (아직 이용 가능 — 급함)' : ''}  ${r.decision.reason}`,
  )
}

if (!toRevoke.length) {
  console.log('\n회수할 건 없음.')
} else if (!APPLY) {
  console.log(`\n회수 대상 ${toRevoke.length}건. 실제로 회수하려면: npm run audit:refunds -- --apply`)
} else {
  let done = 0
  for (const r of toRevoke) {
    // status=active 조건을 남겨 두 번 돌려도 한 번만 바뀌게 한다.
    const res = await db(
      `subscriptions?order_id=eq.${encodeURIComponent(r.payment.id)}&status=eq.${ACTIVE}`,
      { method: 'PATCH', body: JSON.stringify({ status: REVOKED }), headers: { Prefer: 'return=representation' } },
    )
    const changed = await res.json()
    // PostgREST도 0행 갱신을 성공으로 준다 — 바뀐 행을 받아 봐야 '했다고 착각'을 막는다.
    if (!res.ok || !Array.isArray(changed) || changed.length !== 1) {
      console.error(`  회수 실패 ${r.payment.id}: ${res.status} ${JSON.stringify(changed).slice(0, 200)}`)
      continue
    }
    done++
    console.log(`  회수됨 ${r.payment.id} user=${String(changed[0].user_id).slice(0, 8)}`)
  }
  console.log(`\n${done}/${toRevoke.length}건 회수 완료.`)
  if (done !== toRevoke.length) process.exitCode = 1
}

if (toReview.length) {
  console.log(`\n사람이 정해야 하는 건 ${toReview.length}건(부분 취소 등) — 위 목록의 review 행.`)
}
