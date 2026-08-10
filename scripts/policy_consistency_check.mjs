// 법적 문서(약관·환불정책)가 약속한 것을 제품이 실제로 지키는지 본다.
//   npm run check:policy
//
// 이 검사가 생긴 이유: 같은 종류의 어긋남을 두 번 찾았다.
//   1) 환불정책은 "7일 이내 + AI 미사용"을 기준으로 삼는데, 그 둘을 확인할 화면이 없었다.
//   2) 이용약관은 "AI 채점 결과는 참고 정보"라고 적어 두었는데, 정작 점수가 나오는
//      화면 4곳 어디에도 그 말이 없었다("불합격"까지 단언하면서).
//
// 문서만 고치고 제품을 안 고치면 아무도 모른다 — 약관을 읽고 들어오는 사람은 없다.
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

// ── 약관: "AI 채점 결과는 참고 정보" ────────────────────────────────────────
// 점수를 보여 주는 화면은 전부 그 말을 달고 있어야 한다. 한 곳이라도 빠지면 그 화면을
// 본 사람은 안내받지 못한 것과 같다 — 실제로 네 곳 모두 빠져 있었다.
console.log('\nAI 점수 화면 — 약관이 약속한 "참고 정보" 안내')

const terms = fs.readFileSync(path.join(process.cwd(), 'src', 'app', '(legal)', 'terms', 'page.tsx'), 'utf-8')
if (!/AI 채점[·・]?첨삭 결과는[^<]*참고 정보/.test(terms)) {
  bad++
  console.log('  × 약관에서 "AI 채점·첨삭 결과는 … 참고 정보" 문장을 못 찾음 — 약속이 사라졌는지 확인 필요')
} else {
  console.log('  ○ 약관이 "참고 정보"라고 약속한다')
}

// AI 점수를 화면에 찍는 파일들. 새 채점 화면을 만들면 여기에 추가한다.
const SCORE_SCREENS = [
  ['src/components/manuscript/ManuscriptResult.tsx', '원고지 첨삭 결과(합격권/불합격)'],
  ['src/components/cbt/EssayGrader.tsx', '서술형 AI 분석 결과'],
  ['src/app/(main)/cbt/[examId]/result/page.tsx', '시험 결과 등급 카드'],
]
// 공용 컴포넌트를 쓰거나, 직접 같은 취지의 문장을 적었거나 둘 중 하나면 된다
const HAS_NOTICE = /AiEstimateNotice|실제 시험의 채점 결과와 다를 수 있습니다/

for (const [rel, label] of SCORE_SCREENS) {
  const src = fs.readFileSync(path.join(process.cwd(), ...rel.split('/')), 'utf-8')
  if (HAS_NOTICE.test(src)) {
    console.log(`  ○ ${label}`)
  } else {
    bad++
    console.log(`  × ${label} — 참고 점수 안내가 없다 (${rel})`)
  }
}

console.log(bad ? `\n${bad}건 어긋남` : '\n모두 일치')
if (bad) process.exitCode = 1
