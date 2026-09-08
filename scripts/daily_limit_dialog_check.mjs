// 하루 AI 첨삭 한도에 걸리면 설명 창이 뜨는지 — 문구와 배선을 본다(네트워크·DB 없음).
//   npm run check:limit-dialog
//
// 왜 필요한가: 한도 문구는 서버(antiSharing)가 만들고, 창을 띄울지는 화면이 문구 첫머리로 가린다.
// 어느 한쪽이 문구를 고치면 창이 조용히 안 뜨고 옛날처럼 빨간 한 줄만 남는다 — 그 한 줄이
// 2026-09-07 "유료인데 왜 제한?" 문의를 낳았다. 운영자 결정(2026-09-08): 상한은 그대로, 걸리면 설명 창.
import fs from 'node:fs'
import { DAILY_GRADE_LIMIT, DAILY_LIMIT_MESSAGE_PREFIX, dailyLimitMessage, isDailyLimitMessage } from '../src/lib/antiSharingLimits.ts'

const rows = []
const ok = (name, detail = '') => rows.push({ ok: true, name, detail })
const bad = (name, detail = '') => rows.push({ ok: false, name, detail })

// 1) 문구 자체
const msg = dailyLimitMessage()
if (isDailyLimitMessage(msg)) ok('서버 한도 문구를 화면이 알아본다', msg.slice(0, 40) + '…')
else bad('문구 판별', `첫머리 "${DAILY_LIMIT_MESSAGE_PREFIX}" 로 시작하지 않는다`)
if (msg.includes(`${DAILY_GRADE_LIMIT}회`) && msg.includes('자정')) ok('문구에 상한 횟수와 풀리는 시각이 있다')
else bad('문구 내용', msg)
if (!isDailyLimitMessage('계정 공유가 의심되어 이용이 제한되었습니다')) ok('기기 한도 문구는 한도 창을 띄우지 않는다')
else bad('오탐', '기기 한도 문구에도 창이 뜬다')

// 2) 배선 — 서버는 같은 함수로 문구를 만들고, 세 화면은 창을 단다.
const src = (p) => fs.readFileSync(p, 'utf8')
const anti = src('src/lib/antiSharing.ts')
if (anti.includes('dailyLimitMessage()') && !/오늘 AI 첨삭 한도\(/.test(anti)) ok('서버가 문구를 한 곳(antiSharingLimits)에서 가져온다')
else bad('서버 배선', 'antiSharing.ts 가 문구를 직접 들고 있다 — 화면 판별과 어긋날 수 있다')

const screens = [
  'src/components/cbt/EssayGrader.tsx',
  'src/components/manuscript/ManuscriptEditor.tsx',
  'src/app/(main)/practice/essay/PracticeEssay.tsx',
]
for (const p of screens) {
  const t = src(p)
  if (t.includes('<DailyLimitDialog') && t.includes('isDailyLimitMessage(')) ok(`${p.split('/').pop()} 에 한도 창이 달려 있다`)
  else bad(`${p.split('/').pop()} 배선`, '창 또는 판별이 없다')
}
const dialog = src('src/components/grading/DailyLimitDialog.tsx')
if (dialog.includes("timeZone: 'Asia/Seoul'") && dialog.includes('/support')) ok('창이 한국 자정까지 남은 시간과 고객센터 출구를 보여 준다')
else bad('창 내용', '자정 계산(Asia/Seoul) 또는 고객센터 링크가 없다')

console.log('\n하루 한도 설명 창\n')
for (const r of rows) console.log(`  ${r.ok ? '○' : '✖'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
const fail = rows.filter((r) => !r.ok).length
console.log(`\n${fail ? `실패 ${fail}건` : '한도에 걸리면 설명 창이 뜬다.'}`)
process.exitCode = fail ? 1 : 0
