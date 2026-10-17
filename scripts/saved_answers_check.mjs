import assert from 'node:assert/strict'
import { sanitizeSavedAnswers } from '../src/lib/savedAnswers.ts'

const unreadable = Object.defineProperty({}, 'q1', {
  enumerable: true,
  get() { throw new Error('unreadable answer') },
})
const revoked = Proxy.revocable({}, {})
revoked.revoke()

const cases = [
  ['정상 문자열 답안 보존', { q1: '1', '문항-2': '한글 답안\n둘째 줄', q3: '' }, { q1: '1', '문항-2': '한글 답안\n둘째 줄', q3: '' }],
  ['배열 거부', ['1', '2'], {}],
  ['null 거부', null, {}],
  ['undefined 거부', undefined, {}],
  ['숫자 거부', 42, {}],
  ['문자열 거부', '답안', {}],
  ['불리언 거부', true, {}],
  ['숫자 값만 제거', { q1: '1', q2: 2, q3: '' }, { q1: '1', q3: '' }],
  ['중첩 객체 값만 제거', { q1: '답안', q2: { answer: '2' } }, { q1: '답안' }],
  ['배열·null·불리언 값 제거', { q1: ['1'], q2: null, q3: false, q4: '4' }, { q4: '4' }],
  ['빈 객체 허용', {}, {}],
  ['특수 이름의 문자열 키 보존', JSON.parse('{"__proto__":"답안","constructor":"2"}'), JSON.parse('{"__proto__":"답안","constructor":"2"}')],
  ['상속받은 답안 제외', Object.assign(Object.create({ inherited: '2' }), { q1: '1' }), { q1: '1' }],
  ['읽기 오류에도 빈 답안 복구', unreadable, {}],
  ['폐기된 Proxy에도 빈 답안 복구', revoked.proxy, {}],
]

let passed = 0
let failed = 0
function check(name, run) {
  try {
    run()
    passed++
    console.log('PASS: ' + name)
  } catch (error) {
    failed++
    console.error('FAIL: ' + name + '\n' + error.message)
  }
}

for (const [name, raw, expected] of cases) {
  check(name, () => assert.deepEqual(sanitizeSavedAnswers(raw), expected))
}
check('원본 답안 불변 및 반환값 분리', () => {
  const raw = Object.freeze({ q1: '1', q2: 2 })
  const result = sanitizeSavedAnswers(raw)
  assert.deepEqual(result, { q1: '1' })
  assert.notEqual(result, raw)
  result.q1 = '변경'
  assert.deepEqual(raw, { q1: '1', q2: 2 })
})

console.log('결과: 통과 ' + passed + ', 실패 ' + failed)
process.exitCode = failed ? 1 : 0
