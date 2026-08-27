// 방금 낸 결제 한 건이 끝까지 제대로 갔는지 대조한다.
//   npm run verify:payment            — 가장 최근 결제 1건
//   npm run verify:payment -- sub-xxx — 특정 주문번호
//
// 왜 필요한가: '결제됐다'와 '이용권을 받았다'는 다르다. 돈만 나가고 이용권이 안 생기면
// 그건 가장 나쁜 사고인데, 화면에는 안내 문구만 뜨고 사용자가 문의하지 않으면 그걸로 끝이다.
// 실제로 그런 건이 16일간 아무도 모르게 지나간 적이 있다.
//
// 결제대행사(원장) · 우리 DB(이용권) · 웹훅 응답을 한 자리에서 맞춰 본다.
import fs from 'node:fs'
import { PortOneClient } from '@portone/server-sdk'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')
const H = { apikey: ENV.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}` }
const client = PortOneClient({ secret: ENV.PORTONE_API_SECRET })
const kst = (t) => (t ? new Date(t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-')

const wanted = process.argv.slice(2).find((a) => a.startsWith('sub'))
let payment
if (wanted) {
  payment = await client.payment.getPayment({ paymentId: wanted })
} else {
  const from = new Date(Date.now() - 3 * 86400000).toISOString()
  const res = await client.payment.getPayments({ page: { number: 0, size: 100 }, filter: { storeId: ENV.NEXT_PUBLIC_PORTONE_STORE_ID, from, until: new Date().toISOString() } })
  const items = (res?.items ?? []).sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)))
  payment = items[0]
}
if (!payment) { console.log('최근 3일 안에 결제 기록이 없습니다.'); process.exit(1) }

const ok = []
const bad = []
const mark = (cond, good, badMsg) => (cond ? ok : bad).push(cond ? good : badMsg)

console.log(`\n주문번호  ${payment.id}`)
console.log(`시각      ${kst(payment.paidAt ?? payment.requestedAt)}`)
console.log(`상태      ${payment.status}  ·  ${(payment.amount?.total ?? 0).toLocaleString()}원  ·  ${payment.channel?.pgProvider ?? '-'}  ·  ${payment.method?.type ?? '-'}`)
console.log(`기기      ${payment.origin?.platformType ?? '-'}`)
if (payment.failure?.reason) console.log(`실패사유  ${payment.failure.reason}`)

mark(payment.status === 'PAID', '결제대행사에 PAID로 잡혔다', `결제대행사 상태가 ${payment.status}다 — 아직 승인 전이거나 실패다`)
mark((payment.amount?.total ?? 0) === 5500, '금액이 정가(5,500원)와 같다', `금액이 ${payment.amount?.total}원이다`)

// 우리가 보낸 customerId(=userId)로 사용자를 찾는다
const userId = payment.customer?.id ?? payment.customer?.customerId ?? null
mark(Boolean(userId), '결제건에 사용자 정보가 실려 있다', '결제건에 customerId가 없다 — 이용권을 누구에게 줄지 알 수 없다')

// 이용권이 실제로 생겼는가
const subRes = await fetch(`${SB}/rest/v1/subscriptions?select=user_id,amount,status,started_at,expires_at&order_id=eq.${encodeURIComponent(payment.id)}`, { headers: H })
const subs = await subRes.json()
const sub = Array.isArray(subs) ? subs[0] : null
mark(Boolean(sub), '이용권이 발급됐다', '이용권이 없다 — 돈만 나가고 못 받은 상태다(관리자 화면 결제 복구로 재발급)')
if (sub) {
  const live = sub.status === 'active' && new Date(sub.expires_at) > new Date()
  console.log(`이용권    ${sub.status} · ${new Date(sub.started_at).toLocaleDateString('ko-KR')} ~ ${new Date(sub.expires_at).toLocaleDateString('ko-KR')}`)
  mark(live, '지금 이용 가능한 상태다', `이용권이 열려 있지 않다(status=${sub.status})`)
  mark(sub.user_id === userId, '결제자와 이용권 주인이 같다', '결제자와 이용권 주인이 다르다')
}

// 우리 서버가 웹훅을 제대로 받았는가 — 결제대행사가 응답 코드까지 기록해 준다
const hooks = payment.webhooks ?? []
const paidHook = hooks.find((h) => h.paymentStatus === 'PAID')
if (hooks.length) {
  console.log(`웹훅      ${hooks.map((h) => `${h.paymentStatus}:${h.response?.code ?? h.status}`).join(' · ')}`)
}
if (paidHook) mark(String(paidHook.response?.code) === '200', '결제완료 웹훅을 우리 서버가 200으로 받았다', `결제완료 웹훅 응답이 ${paidHook.response?.code}다`)
else if (payment.status === 'PAID') console.log('웹훅      결제완료 웹훅 기록이 아직 없다(콘솔에서 이벤트가 꺼져 있거나 지연)')

// 계정 이메일(누가 샀는지 눈으로 확인)
if (userId) {
  const u = await (await fetch(`${SB}/auth/v1/admin/users/${userId}`, { headers: H })).json()
  if (u?.email) console.log(`구매자    ${u.email}`)
}

console.log('')
for (const l of ok) console.log(`  PASS  ${l}`)
for (const l of bad) console.log(`  FAIL  ${l}`)
console.log(`\n${ok.length}/${ok.length + bad.length} 통과`)
process.exit(bad.length ? 1 : 0)
