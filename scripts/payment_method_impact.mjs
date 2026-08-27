// 카카오페이 도입 전후로 결제 퍼널(진입 → 시도 → 완결)이 달라졌는지 나란히 본다.
//   npm run report:method-impact
//   npm run report:method-impact -- --pivot 2026-08-27   (기준일 바꿔 보기)
//
// 기준일이 왜 8/27인가: 백로그에는 "카카오페이 연동 커밋(2026-08-24)"이라 적혀 있지만,
// 실물 이력은 다르다 — 8/24 커밋(e32d666)은 진단 **문서**이고, 카카오페이를 실제로 붙인
// 커밋은 846d49a(2026-08-27 08:15 KST)다. 그마저 채널키가 배포에 들어가야 열리는 구조라
// 프로덕션에서 언제 켜졌는지는 이 저장소만으로 확정할 수 없다. 그래서 기본 기준일을
// 8/27로 하되 --pivot 으로 바꿔 볼 수 있게 했다.
//
// 단계 정의는 payment_funnel_daily.mjs 와 동일(포트원 status 기준):
//   진입  포트원에 건이 생겼다 = 결제창이 열렸다 (READY 포함 전부)
//   시도  READY 를 넘어갔다 = 사용자가 결제를 실제로 눌렀다 (FAILED 포함)
//   완결  PAID·CANCELLED·PARTIAL_CANCELLED — 판정은 summarizeAttempts 그대로
//
// 포트원 조회 API(무료)만 쓴다. 고객 식별값은 앞 8자만 출력한다.
import fs from 'node:fs'
import { PortOneClient } from '@portone/server-sdk'
import { summarizeAttempts } from '../src/lib/paymentAttemptFunnel.ts'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)

const argv = process.argv.slice(2)
const PIVOT = argv.includes('--pivot') ? argv[argv.indexOf('--pivot') + 1] : '2026-08-27'
if (!/^\d{4}-\d{2}-\d{2}$/.test(PIVOT)) {
  console.error(`날짜 형식이 아니다: ${PIVOT} (YYYY-MM-DD)`)
  process.exit(1)
}

const DAY = 24 * 3600_000
const pivotStart = new Date(`${PIVOT}T00:00:00+09:00`)
const before = { from: new Date(pivotStart.getTime() - 7 * DAY), until: pivotStart }
// 후 구간은 7일을 다 못 채웠을 수 있다 — 지금까지만 자르고, 며칠치인지 밝힌다.
const now = new Date()
const after = { from: pivotStart, until: new Date(Math.min(pivotStart.getTime() + 7 * DAY, now.getTime())) }
if (after.until <= after.from) {
  console.error(`기준일 ${PIVOT} 이 아직 오지 않았다 — 후 구간이 없다.`)
  process.exit(1)
}
const afterDays = (after.until.getTime() - after.from.getTime()) / DAY

const client = PortOneClient({ secret: ENV.PORTONE_API_SECRET })
const storeId = ENV.NEXT_PUBLIC_PORTONE_STORE_ID

async function fetchRows({ from, until }) {
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
  return items.map((p) => ({
    id: p.id,
    status: p.status,
    customerId: p.customer?.id ?? p.customer?.customerId ?? null,
    requestedAt: p.requestedAt ?? null,
    paidAt: p.paidAt ?? null,
    failureReason: p.failure?.reason ?? null,
    // 어느 채널(PG)로 들어온 건인지 — 카카오페이 결제가 실제로 있었는지 여기서만 보인다.
    pg: p.channel?.pgProvider ?? null,
  }))
}

function funnel(rows) {
  const f = summarizeAttempts(rows)
  const tried = rows.filter((r) => r.status !== 'READY')
  return {
    entered: { count: f.attempts.total, people: f.people.total },
    tried: {
      count: tried.length,
      people: new Set(tried.map((r) => r.customerId || `payment:${r.id}`)).size,
    },
    paid: { count: f.attempts.paid, people: f.people.paid },
  }
}

const kstDate = (d) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10)
const span = (r) => `${kstDate(r.from)} ~ ${kstDate(new Date(r.until.getTime() - 1))}`

const [beforeRows, afterRows] = [await fetchRows(before), await fetchRows(after)]
const [fb, fa] = [funnel(beforeRows), funnel(afterRows)]

console.log(`카카오페이 도입 전후 결제 퍼널 비교 (기준일 ${PIVOT}, KST)`)
console.log(`  * 카카오페이를 실제로 붙인 커밋은 846d49a — 2026-08-27 08:15. 채널키가 배포에`)
console.log(`    들어가야 열리는 구조라, 프로덕션에서 켜진 정확한 시각은 저장소로 확정 불가.`)
console.log('')
const line = (name, b, a) =>
  console.log(`  ${name}  전 ${String(b.count).padStart(2)}건/${b.people}명   후 ${String(a.count).padStart(2)}건/${a.people}명`)
console.log(`            전: ${span(before)} (7일)   후: ${span(after)} (${Math.round(afterDays * 10) / 10}일)`)
line('진입', fb.entered, fa.entered)
line('시도', fb.tried, fa.tried)
line('완결', fb.paid, fa.paid)

// 후 구간에서 카카오페이 채널로 들어온 건이 실제로 있는가 — 이게 없으면
// '후'의 변화는 카카오페이와 무관하다.
const kakaoRows = afterRows.filter((r) => /kakao/i.test(r.pg ?? ''))
console.log('')
if (kakaoRows.length) {
  console.log(`  후 구간에 카카오페이 채널 건 ${kakaoRows.length}건:`)
  for (const r of kakaoRows) {
    console.log(`    ${(r.customerId ?? r.id).slice(0, 8)}  ${r.status}  pg=${r.pg ?? '?'}  ${r.requestedAt ?? '-'}`)
  }
} else {
  console.log('  후 구간에 카카오페이 채널로 들어온 건은 0건 — 후 구간의 결제는 전부')
  console.log('  기존 채널(카드)이다. 퍼널 변화가 있어도 카카오페이 효과로 볼 수 없다.')
}

console.log('')
console.log(`  ⚠ 표본이 작다 — 전 구간 진입 ${fb.entered.count}건, 후 구간 진입 ${fa.entered.count}건. 이 규모로는 우연과 효과가 구분되지 않는다.`)
console.log(`    후 구간은 ${Math.round(afterDays * 10) / 10}일치뿐이라 7일 대 7일 비교가 아니다.`)
console.log('    이 숫자로 "효과 있음/없음"을 단정할 수 없다. 방향을 보는 참고 자료로만 쓸 것.')
