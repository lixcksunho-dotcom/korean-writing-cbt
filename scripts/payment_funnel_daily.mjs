// 어제 하루의 결제 퍼널을 본다 — 진입(결제창 열림) → 시도 → 완결, 건과 사람 단위로.
//   npm run report:funnel-daily
//   npm run report:funnel-daily -- --date 2026-08-20   (검증용: 특정 날짜 하루)
//
// 왜 필요한가: report:payments 는 기간 전체 누적이라 "어제 뭐가 달라졌는지"를 못 본다.
// 이 스크립트는 어제 00:00~24:00(KST) 딱 하루만 잘라서 한 줄 요약까지 낸다.
//
// 단계 정의 (포트원 결제건 status 기준):
//   진입  포트원에 건이 생겼다 = 결제창이 열렸다 (READY 포함 전부)
//   시도  READY 를 넘어갔다 = 사용자가 결제를 실제로 눌렀다 (FAILED 포함)
//   완결  PAID·CANCELLED·PARTIAL_CANCELLED — 판정은 summarizeAttempts 를 그대로 쓴다
//
// 포트원 조회 API(무료)만 쓴다. 결제 0건인 날에도 정상 종료한다(0건임을 명시).
import fs from 'node:fs'
import { PortOneClient } from '@portone/server-sdk'
import { summarizeAttempts } from '../src/lib/paymentAttemptFunnel.ts'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)

// '어제'는 KST 기준이다. 서버 시계가 UTC여도 한국 날짜로 잘라야 실측과 맞는다.
const argv = process.argv.slice(2)
const kstNow = new Date(Date.now() + 9 * 3600_000)
const defaultDate = new Date(kstNow.getTime() - 24 * 3600_000).toISOString().slice(0, 10)
const DATE = argv.includes('--date') ? argv[argv.indexOf('--date') + 1] : defaultDate
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) {
  console.error(`날짜 형식이 아니다: ${DATE} (YYYY-MM-DD)`)
  process.exit(1)
}
const from = new Date(`${DATE}T00:00:00+09:00`)
const until = new Date(from.getTime() + 24 * 3600_000)

const client = PortOneClient({ secret: ENV.PORTONE_API_SECRET })
const storeId = ENV.NEXT_PUBLIC_PORTONE_STORE_ID

const items = []
for (let page = 0; ; page++) {
  const res = await client.payment.getPayments({
    page: { number: page, size: 100 },
    filter: { storeId, from: from.toISOString(), until: until.toISOString() },
  })
  const got = res?.items ?? []
  items.push(...got)
  if (got.length < 100) break
}

const label = DATE === defaultDate ? `어제(${DATE})` : DATE

if (!items.length) {
  console.log(`${label} 결제 퍼널: 결제창 진입 0건 — 결제 활동 없음`)
  process.exit(0)
}

const rows = items.map((p) => ({
  id: p.id,
  status: p.status,
  customerId: p.customer?.id ?? p.customer?.customerId ?? null,
  requestedAt: p.requestedAt ?? null,
  paidAt: p.paidAt ?? null,
  failureReason: p.failure?.reason ?? null,
}))

const f = summarizeAttempts(rows)
// '시도'는 summarizeAttempts 가 따로 세 주지 않는다 — READY 를 넘어간 건만 거른다.
// 사람 단위는 같은 묶음 규칙(customerId 없으면 건 하나 = 한 사람)으로 센다.
const triedRows = rows.filter((r) => r.status !== 'READY').length
const triedPeople = new Set(
  rows.filter((r) => r.status !== 'READY').map((r) => r.customerId || `payment:${r.id}`),
).size

const pct = (r) => `${Math.round(r * 1000) / 10}%`

console.log(`${label} 결제 퍼널 (00:00~24:00 KST)`)
console.log(`  진입(결제창 열림)   ${f.attempts.total}건 / ${f.people.total}명`)
console.log(`  시도(READY 제외)    ${triedRows}건 / ${triedPeople}명`)
console.log(`  완결                ${f.attempts.paid}건 / ${f.people.paid}명 (사람 단위 ${pct(f.people.ratio)})`)
if (f.failureReasons.length) {
  console.log('  실패 사유(포트원 기록)')
  for (const r of f.failureReasons) console.log(`    ${r.count}건  ${r.reason}`)
}
console.log(
  `요약: ${DATE} 진입 ${f.attempts.total}건(${f.people.total}명) → 시도 ${triedRows}건(${triedPeople}명)` +
  ` → 완결 ${f.attempts.paid}건(${f.people.paid}명), 사람 완결률 ${pct(f.people.ratio)}`,
)
