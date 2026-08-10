// 환불 판정이 /refund 문서와 어긋나지 않는지 본다.
//   npm run check:refund
//
// 이 판정은 사람이 돈을 돌려받는지를 가른다. 화면에 "환불 대상"이라고 떠 있으면
// 사장님은 그대로 환불해 준다 — 틀리면 안 주고 넘어가거나, 안 줘도 되는 걸 주게 된다.
// 그래서 경계값(7일째 되는 날, 1회 사용)을 고정해 둔다.
//
// 문서에 적힌 숫자(7일)도 같이 본다. 문서를 고치고 코드를 안 고치면 둘이 갈라진다.
import fs from 'node:fs'
import path from 'node:path'
import { judgeRefund, REFUND_WINDOW_DAYS } from '../src/lib/refundEligibility.ts'

const DAY = 86400_000
const NOW = Date.parse('2026-08-11T09:00:00+09:00')
const ago = (days) => new Date(NOW - days * DAY).toISOString()

const cases = [
  ['결제 없음 → 판정 안 함', judgeRefund(null, 0, NOW).verdict, 'no_payment'],
  ['오늘 결제 · 미사용 → 환불 대상', judgeRefund(ago(0), 0, NOW).verdict, 'refundable'],
  ['6일 전 결제 · 미사용 → 아직 환불 대상', judgeRefund(ago(6), 0, NOW).verdict, 'refundable'],
  ['7일째 · 미사용 → 기간 경과', judgeRefund(ago(7), 0, NOW).verdict, 'window_over'],
  ['1일 전 결제 · 1회 사용 → 환불 제한', judgeRefund(ago(1), 1, NOW).verdict, 'used'],
  ['30일 전 결제 · 사용함 → 환불 제한', judgeRefund(ago(30), 5, NOW).verdict, 'used'],
  ['날짜가 깨졌으면 판정 안 함', judgeRefund('(없음)', 0, NOW).verdict, 'no_payment'],
]

let bad = 0
console.log('\n환불 판정 — 정책 경계값')
for (const [name, got, want] of cases) {
  const ok = got === want
  if (!ok) bad++
  console.log(`  ${ok ? '○' : '×'} ${name}${ok ? '' : `  (기대 ${want}, 실제 ${got})`}`)
}

// 남은 일수를 사람에게 보여 주므로 이것도 맞아야 한다
const left = judgeRefund(ago(2), 0, NOW).label
if (!left.includes(`${REFUND_WINDOW_DAYS - 2}일 남음`)) {
  bad++
  console.log(`  × 남은 기간 표기가 틀림 — "${left}"`)
} else {
  console.log(`  ○ 남은 기간 표기 "${left}"`)
}

// 문서의 '7일'과 코드의 REFUND_WINDOW_DAYS가 같은지
const refundPage = fs.readFileSync(path.join(process.cwd(), 'src', 'app', '(legal)', 'refund', 'page.tsx'), 'utf-8')
const m = /결제 후 (\d+)일 이내/.exec(refundPage)
if (!m) {
  bad++
  console.log('  × 환불 문서에서 "결제 후 N일 이내" 문장을 못 찾음 — 문구가 바뀌었는지 확인 필요')
} else if (Number(m[1]) !== REFUND_WINDOW_DAYS) {
  bad++
  console.log(`  × 문서는 ${m[1]}일인데 코드는 ${REFUND_WINDOW_DAYS}일`)
} else {
  console.log(`  ○ 문서와 코드가 같은 기간(${REFUND_WINDOW_DAYS}일)을 쓴다`)
}

console.log(bad ? `\n${bad}건 어긋남` : '\n모두 일치')
if (bad) process.exitCode = 1
