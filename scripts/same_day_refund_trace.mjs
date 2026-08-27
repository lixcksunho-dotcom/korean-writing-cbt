// 특정 날짜의 "순매출 0원 결제"가 왜 0원인지 원장에서 추적한다 — 조회 전용.
//   node scripts/same_day_refund_trace.mjs                    (기본: 2026-08-27)
//   node scripts/same_day_refund_trace.mjs --date 2026-08-27  [--json]
//
// 왜 필요한가: daily_revenue.mjs 가 "0원 N건"을 낼 때, 그것이
//   ① 당일 결제 → 당일 취소(즉시 환불)  ② 부분취소  ③ 결제 실패가 완결로 잘못 집계
// 셋 중 어느 쪽인지에 따라 대응이 완전히 다르다. 이 스크립트는 포트원 원장에서
// 해당 날짜에 걸린 결제·취소 건의 status·cancellations·시각·사유를 뽑아 판정한다.
//
// 판정이 애매하면 단정하지 않고 가능성과 근거를 나란히 낸다.
// 고객 식별자는 id 앞 8자만 출력한다. 취소·환불 실행 호출은 없다.
import fs from 'node:fs'
import { PortOneClient } from '@portone/server-sdk'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)

const argv = process.argv.slice(2)
const DATE = argv.includes('--date') ? argv[argv.indexOf('--date') + 1] : '2026-08-27'
const AS_JSON = argv.includes('--json')
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) {
  console.error(`날짜 형식이 아니다: ${DATE} (YYYY-MM-DD)`)
  process.exit(1)
}

// 대상일 하루(KST). 조회 창은 30일 전부터 — 며칠 전 결제가 대상일에 취소된 경우도
// daily_revenue 는 대상일 매출에서 빼므로, 그 건까지 잡아야 판정이 완전하다.
const dayStart = new Date(`${DATE}T00:00:00+09:00`)
const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000)
const windowFrom = new Date(dayStart.getTime() - 30 * 86400_000)

const client = PortOneClient({ secret: ENV.PORTONE_API_SECRET })
const items = []
for (let page = 0; ; page++) {
  const res = await client.payment.getPayments({
    page: { number: page, size: 100 },
    filter: { storeId: ENV.NEXT_PUBLIC_PORTONE_STORE_ID, from: windowFrom.toISOString(), until: dayEnd.toISOString() },
  })
  const got = res?.items ?? []
  items.push(...got)
  if (got.length < 100) break
}

const inDay = (t) => t && new Date(t) >= dayStart && new Date(t) < dayEnd
const kst = (t) => t ? new Date(new Date(t).getTime() + 9 * 3600_000).toISOString().replace('T', ' ').slice(0, 19) + ' KST' : '-'
const short = (id) => (id ? String(id).slice(0, 8) : '-')
const won = (n) => `${(n ?? 0).toLocaleString('ko-KR')}원`

// daily_revenue.mjs 와 같은 기준: 매출은 paidAt 이 대상일인 PAID·(PARTIAL_)CANCELLED,
// 차감은 cancelledAt 이 대상일인 취소. 두 축으로 관련 건을 모은다.
const paidToday = items.filter((p) => inDay(p.paidAt) && ['PAID', 'PARTIAL_CANCELLED', 'CANCELLED'].includes(p.status))
const cancelledToday = items.filter((p) => (p.cancellations ?? []).some((c) => inDay(c.cancelledAt)))
const failedToday = items.filter((p) => inDay(p.requestedAt) && !inDay(p.paidAt) && !paidToday.includes(p))
const related = [...new Set([...paidToday, ...cancelledToday])]

const gross = paidToday.reduce((a, p) => a + (p.amount?.total ?? 0), 0)
const cancelled = items.flatMap((p) => p.cancellations ?? []).filter((c) => inDay(c.cancelledAt))
  .reduce((a, c) => a + (c.totalAmount ?? 0), 0)

const detail = related.map((p) => ({
  paymentId: p.id,
  customer: short(p.customer?.id ?? p.customer?.customerId),
  status: p.status,
  amount: p.amount?.total ?? 0,
  requestedAt: p.requestedAt ?? null,
  paidAt: p.paidAt ?? null,
  failureReason: p.failure?.reason ?? null,
  cancellations: (p.cancellations ?? []).map((c) => ({
    cancelledAt: c.cancelledAt ?? null,
    totalAmount: c.totalAmount ?? 0,
    reason: c.reason ?? null,
    status: c.status ?? null,
  })),
}))

// 판정 — 단정 가능한 경우만 단정하고, 아니면 가능성을 나란히 낸다.
const verdicts = detail.map((p) => {
  const full = p.cancellations.reduce((a, c) => a + c.totalAmount, 0) >= p.amount
  const sameDay = inDay(p.paidAt) && p.cancellations.some((c) => inDay(c.cancelledAt))
  const mins = p.paidAt && p.cancellations[0]?.cancelledAt
    ? Math.round((new Date(p.cancellations[0].cancelledAt) - new Date(p.paidAt)) / 60_000) : null
  if (p.status === 'CANCELLED' && sameDay && full) {
    return { paymentId: p.paymentId, verdict: '당일 결제 → 당일 전액 취소', minutesToCancel: mins }
  }
  if (p.status === 'PARTIAL_CANCELLED') {
    return { paymentId: p.paymentId, verdict: '부분취소', minutesToCancel: mins }
  }
  if (p.status === 'FAILED' || p.status === 'READY') {
    return { paymentId: p.paymentId, verdict: `집계 대상 아님(${p.status}) — 완결로 집계됐다면 집계 버그`, minutesToCancel: null }
  }
  if (p.status === 'CANCELLED' && !inDay(p.paidAt)) {
    return { paymentId: p.paymentId, verdict: '이전 결제의 당일 취소(대상일 매출에서 차감만 발생)', minutesToCancel: mins }
  }
  if (p.status === 'PAID' && !p.cancellations.length) {
    return { paymentId: p.paymentId, verdict: '정상 결제(취소 없음)', minutesToCancel: null }
  }
  return { paymentId: p.paymentId, verdict: `판정 보류 — status=${p.status}, 근거를 상세에서 볼 것`, minutesToCancel: mins }
})

if (AS_JSON) {
  console.log(JSON.stringify({ date: DATE, gross, cancelled, net: gross - cancelled, payments: detail, verdicts, failedTodayCount: failedToday.length }, null, 2))
  process.exit(0)
}

console.log(`${DATE} (KST) 순매출 0원 경위 추적 — 포트원 원장 기준`)
console.log(`  매출 ${won(gross)} − 취소 ${won(cancelled)} = 순매출 ${won(gross - cancelled)}  (daily_revenue 와 같은 기준)`)
if (!related.length) {
  console.log('  대상일에 걸린 결제·취소 건 없음')
  process.exit(0)
}
for (const p of detail) {
  console.log(`\n결제 ${p.paymentId}  고객 ${p.customer}  ${won(p.amount)}  status=${p.status}`)
  console.log(`  결제창 열림 ${kst(p.requestedAt)}  →  결제 승인 ${kst(p.paidAt)}`)
  if (p.failureReason) console.log(`  실패 사유: ${p.failureReason}`)
  for (const c of p.cancellations) {
    console.log(`  취소 ${kst(c.cancelledAt)}  ${won(c.totalAmount)}  사유: ${c.reason ?? '(기록 없음)'}`)
  }
  const v = verdicts.find((v) => v.paymentId === p.paymentId)
  console.log(`  판정: ${v.verdict}${v.minutesToCancel != null ? ` (결제 후 ${v.minutesToCancel}분 만에 취소)` : ''}`)
}
if (failedToday.length) {
  console.log(`\n참고: 대상일에 완결 못 간 건 ${failedToday.length}건 (READY/FAILED — 매출 집계 미포함이 정상)`)
  for (const p of failedToday) console.log(`  ${p.id}  status=${p.status}${p.failure?.reason ? `  사유: ${p.failure.reason}` : ''}`)
}
