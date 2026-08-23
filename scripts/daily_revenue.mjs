// 오늘 매출 한 줄. 원장은 포트원 — subscriptions 테이블엔 무료 발급이 섞여 매출이 아니다.
//   node scripts/daily_revenue.mjs [--days 7] [--json]
import fs from 'node:fs'
import { PortOneClient } from '@portone/server-sdk'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)
const argv = process.argv.slice(2)
const DAYS = argv.includes('--days') ? Number(argv[argv.indexOf('--days') + 1]) : 1
const AS_JSON = argv.includes('--json')

// KST 기준 오늘 00:00 (서버 로컬시간대에 흔들리지 않게 UTC 산술로 고정)
const KST = 9 * 3600 * 1000
const k = new Date(Date.now() + KST)
const todayStart = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - KST
const from = todayStart - (DAYS - 1) * 86400000

const client = PortOneClient({ secret: ENV.PORTONE_API_SECRET })
const items = []
for (let page = 0; ; page++) {
  const res = await client.payment.getPayments({
    page: { number: page, size: 100 },
    filter: { storeId: ENV.NEXT_PUBLIC_PORTONE_STORE_ID, from: new Date(from).toISOString(), until: new Date().toISOString() },
  })
  const got = res?.items ?? []
  items.push(...got)
  if (got.length < 100) break
}

const dayKey = (t) => new Date(new Date(t).getTime() + KST).toISOString().slice(0, 10)
const days = new Map()
const bump = (key, field, n) => {
  const row = days.get(key) ?? { paid: 0, count: 0, cancelled: 0 }
  row[field] += n
  days.set(key, row)
}
for (const p of items) {
  if (p.paidAt && (p.status === 'PAID' || p.status === 'PARTIAL_CANCELLED' || p.status === 'CANCELLED')) {
    const amt = p.amount?.total ?? 0
    const key = dayKey(p.paidAt)
    if (new Date(p.paidAt).getTime() >= from) { bump(key, 'paid', amt); bump(key, 'count', 1) }
  }
  // 취소는 취소 시점 기준으로 따로 — 결제일과 다른 날 환불되면 그날 매출에서 빼야 한다
  for (const c of p.cancellations ?? []) {
    if (c.cancelledAt && new Date(c.cancelledAt).getTime() >= from) bump(dayKey(c.cancelledAt), 'cancelled', c.totalAmount ?? 0)
  }
}

const today = dayKey(Date.now())
const t = days.get(today) ?? { paid: 0, count: 0, cancelled: 0 }
const net = t.paid - t.cancelled
if (AS_JSON) {
  console.log(JSON.stringify({ date: today, gross: t.paid, cancelled: t.cancelled, net, count: t.count }))
} else {
  const won = (n) => `${n.toLocaleString('ko-KR')}원`
  console.log(`kptest 당일 매출 (${today} KST)`)
  console.log(`  순매출 ${won(net)}  ·  결제 ${t.count}건${t.cancelled ? `  ·  환불 ${won(t.cancelled)}` : ''}`)
  if (DAYS > 1) {
    console.log(`\n최근 ${DAYS}일`)
    for (let i = DAYS - 1; i >= 0; i--) {
      const key = dayKey(todayStart - i * 86400000 + 3600000)
      const r = days.get(key) ?? { paid: 0, count: 0, cancelled: 0 }
      console.log(`  ${key}  ${String(won(r.paid - r.cancelled)).padStart(11)}  ${r.count}건`)
    }
    const sum = [...days.values()].reduce((a, r) => a + r.paid - r.cancelled, 0)
    console.log(`  합계        ${won(sum)}`)
  }
}
