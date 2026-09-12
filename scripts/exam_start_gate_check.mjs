import assert from 'node:assert/strict'
import { parseExamStartText } from './exam_start_gate.mjs'

const cases = [
  ['시작 안내', '시험 시간\n120분\n객관식\n30문항\n서술형\n10문항\n시작을 눌러야 시간이 갑니다.',
    { gate: true, minutes: 120, objectiveCount: 30, essayCount: 10, total: null }],
  ['공백·서술형 없음', '시험 시간 90 분 객관식 25 문항 서술형 0 문항 시작을\n눌러야',
    { gate: true, minutes: 90, objectiveCount: 25, essayCount: 0, total: null }],
  ['기존 시험 화면', '남은 시간 119:58\n0 / 40 완료',
    { gate: false, minutes: null, objectiveCount: null, essayCount: null, total: 40 }],
  ['이어서 풀기', '12/40 완료',
    { gate: false, minutes: null, objectiveCount: null, essayCount: null, total: 40 }],
  ['목록의 시작하기는 관문 아님', '모의고사 1회 시작하기',
    { gate: false, minutes: null, objectiveCount: null, essayCount: null, total: null }],
]
for (const [name, text, expected] of cases) {
  assert.deepEqual(parseExamStartText(text), expected, name)
  console.log(`○ ${name}`)
}
console.log(`시험 시작 관문 ${cases.length}/${cases.length} 통과`)
