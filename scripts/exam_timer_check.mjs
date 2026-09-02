// 시험 중 시간 안내와 미완료 안내가 제대로 도는지 본다.
//   npm run check:exam-timer
//
// 왜 필요한가: 시간 배분에서 점수가 갈리는 시험이다(우리 블로그가 계속 그렇게 쓴다).
// 그런데 화면은 10분 미만이 되면 **10분 내내 빨갛게 깜빡이기만** 했다. 시야 한쪽이
// 10분 동안 깜빡이면 문제를 못 읽고, 깜빡임은 멀미·편두통을 부르는 사람도 있다.
// 실제 시험은 "10분 남았습니다"를 한 번 말하고 만다.
//
// 그리고 제출 확인창은 '12문항 미완료'라고만 하고 갈 길을 안 줬다 — 창을 닫고
// 100칸짜리 목록에서 빈 칸을 눈으로 찾아야 했다.

import fs from 'node:fs'
import { examTimerLevel, timerNotice } from '../src/lib/examTimerLevel.ts'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log('\n시험 중 시간·미완료 안내\n')

// ── 단계 판정 ──────────────────────────────────────────────────────────────
if (examTimerLevel(120 * 60) === 'normal') ok('시험 초반에는 시계가 조용하다', '120분')
else bad('초반 단계', examTimerLevel(120 * 60))

if (examTimerLevel(600) === 'soon' && examTimerLevel(601) === 'normal') ok('10분에 눈에 띄기 시작한다')
else bad('10분 경계', `${examTimerLevel(601)} → ${examTimerLevel(600)}`)

if (examTimerLevel(180) === 'urgent' && examTimerLevel(181) === 'soon') ok('3분부터 서두르라고 말한다')
else bad('3분 경계', `${examTimerLevel(181)} → ${examTimerLevel(180)}`)

if (examTimerLevel(0) === 'urgent') ok('시간이 다 돼도 단계가 뒤집히지 않는다')
else bad('0초', examTimerLevel(0))

// ── 사람 말로 알려 주는가 ─────────────────────────────────────────────────
if (timerNotice(7200) === null) ok('평상시에는 아무 말도 안 한다')
else bad('과잉 안내', timerNotice(7200))
if (/10분/.test(timerNotice(600) ?? '')) ok('10분 남았다고 말한다', timerNotice(600))
else bad('10분 안내', String(timerNotice(600)))
if (/안 푼/.test(timerNotice(120) ?? '')) ok('막판에는 무엇을 하라고까지 말한다', timerNotice(120))
else bad('막판 안내', String(timerNotice(120)))

// ── 화면에 실제로 붙어 있는가 ─────────────────────────────────────────────
const player = fs.readFileSync('src/components/cbt/ExamPlayer.tsx', 'utf8')

if (player.includes('examTimerLevel')) ok('시험 화면이 단계를 쓴다')
else bad('화면 연결', '옛 방식(10분 미만 깜빡임)이 그대로다')

if (player.includes('motion-safe:animate-pulse')) ok('움직임을 끈 사람에게는 깜빡이지 않는다', 'prefers-reduced-motion')
else bad('움직임 설정', '설정과 무관하게 깜빡인다')

if (!/[^-]animate-pulse/.test(player.replace(/motion-safe:animate-pulse/g, ''))) ok('무조건 깜빡이는 자리가 없다')
else bad('깜빡임', '조건 없는 animate-pulse가 남아 있다')

if (player.includes("role=\"timer\"")) ok('낭독기에 시계라고 알린다')
else bad('접근성', '시계인지 모른다')

if (player.includes('안 푼 첫 문항으로 가기')) ok('제출 전에 안 푼 문항으로 데려다준다')
else bad('미완료 이동', '몇 개 비었는지만 알려 주고 길은 안 준다')

console.log(`\n${fail ? '시간 안내에 구멍이 있다.' : '시간을 제때, 과하지 않게 알린다.'}`)
process.exit(fail ? 1 : 0)
