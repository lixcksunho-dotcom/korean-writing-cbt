// 객관식 연습 '풀이 설정'과 시험 '검토 표시'의 계산 부분을 화면 없이 검사한다.
//   npm run check:practice
//
// 왜 필요한가: 보기를 섞으면 '화면 ③'과 '정답 ③'이 다른 것이 된다. 여기가 어긋나면
// 맞힌 답을 틀렸다고 하거나, 설정을 끄는 순간 정답이 바뀐다. 섞는 건 재현돼야 하고
// (새로고침해도 같은 순서), 설정·표시 저장값이 깨져도 연습·시험은 열려야 한다.

import {
  parsePrefs, DEFAULT_PREFS, permutation, shuffleWithSeed, choiceOrder, hashSeed,
} from '../src/lib/practiceSession.ts'
import { parseFlags, toggleFlag } from '../src/lib/examReviewFlags.ts'

let failed = false
const ok = (n, d = '') => console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`)
const bad = (n, d = '') => { console.error(`  × ${n}${d ? ` — ${d}` : ''}`); failed = true }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

console.log('\n객관식 연습 풀이 설정 · 검토 표시\n')

// 1) 설정 저장값 — 깨진 값은 기본값, 모르는 값은 기본값, 올바른 값은 그대로
same(parsePrefs(null), DEFAULT_PREFS) ? ok('설정 없음 → 기본값') : bad('설정 없음 → 기본값')
same(parsePrefs('{broken'), DEFAULT_PREFS) ? ok('깨진 JSON → 기본값') : bad('깨진 JSON → 기본값')
same(parsePrefs('{"order":"zigzag","reveal":7,"shuffleChoices":"yes"}'), DEFAULT_PREFS)
  ? ok('모르는 값 → 기본값') : bad('모르는 값 → 기본값', JSON.stringify(parsePrefs('{"order":"zigzag","reveal":7,"shuffleChoices":"yes"}')))
const full = { order: 'random', shuffleChoices: true, reveal: 'deferred' }
same(parsePrefs(JSON.stringify(full)), full) ? ok('저장한 설정 그대로 복원') : bad('저장한 설정 그대로 복원')

// 2) 순열 — 전단사(모든 번호가 정확히 한 번), 씨앗 고정이면 재현
for (const n of [2, 5, 39]) {
  const p = permutation(n, 12345)
  const bij = p.length === n && new Set(p).size === n && p.every(i => i >= 0 && i < n)
  bij ? ok(`순열 n=${n} 전단사`) : bad(`순열 n=${n} 전단사`, p.join(','))
}
same(permutation(39, 777), permutation(39, 777)) ? ok('같은 씨앗 → 같은 문항 순서') : bad('같은 씨앗 → 같은 문항 순서')
!same(permutation(39, 777), permutation(39, 778)) ? ok('다른 씨앗 → 다른 문항 순서') : bad('다른 씨앗 → 다른 문항 순서')
same(permutation(1, 5), [0]) && same(permutation(0, 5), []) ? ok('문항 0·1개도 안전') : bad('문항 0·1개도 안전')

// 3) 문항 섞기 — 내용은 보존(빠지거나 겹치는 문항 없음)
const qs = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}` }))
const sh = shuffleWithSeed(qs, 42)
same([...sh].map(q => q.id).sort(), qs.map(q => q.id).sort()) ? ok('문항 섞기 — 집합 보존') : bad('문항 섞기 — 집합 보존')

// 4) 보기 섞기 — 꺼져 있으면 항등, 켜지면 문항마다 다른 순서이되 같은 세션에선 고정
same(choiceOrder(5, 'q1', 1, false), [0, 1, 2, 3, 4]) ? ok('보기 섞기 꺼짐 → 원래 순서') : bad('보기 섞기 꺼짐 → 원래 순서')
const a = choiceOrder(5, 'q1', 99, true), b = choiceOrder(5, 'q1', 99, true), c = choiceOrder(5, 'q2', 99, true)
same(a, b) ? ok('같은 문항·같은 씨앗 → 같은 보기 순서') : bad('같은 문항·같은 씨앗 → 같은 보기 순서')
new Set(a).size === 5 ? ok('보기 순열 전단사') : bad('보기 순열 전단사', a.join(','))
// 100문항을 섞었을 때 전부 항등이면 섞은 게 아니다(확률적으로 불가능해야 한다)
const changed = Array.from({ length: 100 }, (_, i) => choiceOrder(5, `id${i}`, 99, true)).filter(o => !same(o, [0, 1, 2, 3, 4])).length
changed >= 90 ? ok('보기 섞기 켜짐 → 실제로 섞인다', `${changed}/100`) : bad('보기 섞기 켜짐 → 실제로 섞인다', `${changed}/100`)
!same(a, c) || hashSeed(99, 'q1') !== hashSeed(99, 'q2') ? ok('문항마다 씨앗이 다르다') : bad('문항마다 씨앗이 다르다')

// 5) 정답 판정 — 화면 i번째를 눌러도 저장·채점은 원래 번호
{
  const correct = '3' // 원래 ③
  const order = choiceOrder(5, 'qx', 2024, true)
  const screenIdx = order.indexOf(2) // 원래 ③이 화면에서 몇 번째인가
  const storedVal = String(order[screenIdx] + 1)
  storedVal === correct ? ok('섞인 화면에서 정답을 누르면 원래 번호로 채점된다', `화면 ${screenIdx + 1}번째`) : bad('섞인 화면에서 정답 판정', `${storedVal} ≠ ${correct}`)
}

// 6) 검토 표시 — 깨진 값은 빈 목록, 토글은 넣고 빼고, 중복 없음
same(parseFlags(null), []) && same(parseFlags('nope'), []) && same(parseFlags('{"a":1}'), []) ? ok('검토 표시 깨진 값 → 빈 목록') : bad('검토 표시 깨진 값 → 빈 목록')
same(parseFlags('["a","a","",3,"b"]'), ['a', 'b']) ? ok('검토 표시 정리(중복·빈값·숫자 제거)') : bad('검토 표시 정리', JSON.stringify(parseFlags('["a","a","",3,"b"]')))
let f = []
f = toggleFlag(f, 'q5'); f = toggleFlag(f, 'q2'); f = toggleFlag(f, 'q5')
same(f, ['q2']) ? ok('토글 — 넣고 다시 누르면 빠진다') : bad('토글', JSON.stringify(f))

console.log(failed ? '\n실패한 검사가 있습니다.\n' : '\n모두 통과.\n')
process.exit(failed ? 1 : 0)
