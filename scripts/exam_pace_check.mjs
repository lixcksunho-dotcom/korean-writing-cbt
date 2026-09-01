// 시험 중 속도 안내가 맞는 말을 하는지 숫자로 본다.
//   npm run check:pace
//
// 왜 필요한가: 이 안내는 '못 끝낸다'고 말할 수 있어서, 틀리면 멀쩡히 갈 사람을
// 조급하게 만든다. 반대로 늦은 사람에게 여유롭다고 하면 안 하느니만 못하다.
// 화면 없이 계산만 떼어 실제 회차 조건(100문항 120분)으로 확인한다.

import { computePace, paceMessage } from '../src/lib/examPace.ts'

let failed = false
const ok = (n, d = '') => console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`)
const bad = (n, d = '') => { console.error(`  × ${n}${d ? ` — ${d}` : ''}`); failed = true }

const TOTAL = 39
const EXAM = 120 * 60

/** 문항당 sec로 answered문항을 푼 시점의 상태 */
const at = (answered, secPerQ) => {
  const elapsed = answered * secPerQ
  return computePace(answered, TOTAL, elapsed, EXAM - elapsed)
}

console.log('\n시험 중 속도 안내 — 39문항 · 120분\n')

// 1) 시작 직후에는 판단하지 않는다 (표본 부족)
if (at(2, 30).kind === 'warmup') ok('2문항까지는 아무 말도 안 한다', '표본이 적어 겁주면 방해다')
else bad('초반 침묵', '2문항 만에 판정을 내린다')

// 2) 딱 맞는 속도(72초/문항 = 120분에 100문항)
const exact = at(20, EXAM / TOTAL)  // 나누어떨어지지 않아도 실수로 그대로 쓴다
if (exact.kind === 'ontrack' || exact.kind === 'tight') ok('정확히 맞는 속도는 통과로 본다', `${exact.kind} · ${paceMessage(exact)}`)
else bad('딱 맞는 속도', `${exact.kind}로 판정 — ${paceMessage(exact)}`)

// 3) 느리면 못 끝낸다고 말하고, 몇 번까지인지 숫자를 준다
const slow = at(20, 300)   // 문항당 300초 → 39문항이면 195분 필요
if (slow.kind !== 'behind') bad('느린 속도 경고', `${slow.kind}로 판정 — 경고가 안 뜬다`)
else {
  // 20문항에 2000초 썼고 5200초 남음 → 52문항 더 = 72번까지
  const expected = 20 + Math.floor((EXAM - 20 * 300) / 300)
  if (slow.reachable === expected && slow.shortfall === TOTAL - expected) {
    ok('느리면 몇 번까지 가는지 알려 준다', paceMessage(slow))
  } else {
    bad('느린 속도 계산', `${slow.reachable}번이라는데 계산은 ${expected}번`)
  }
}

// 4) 빠르면 여유를 알려 준다 — 다만 %가 세 자리로 튀면 사람이 못 읽는다
const fast = at(30, 40)
if (fast.kind !== 'ontrack') bad('빠른 속도', `${fast.kind} — ${paceMessage(fast)}`)
else if (/\d{3,}%/.test(paceMessage(fast))) bad('여유 표현', `읽을 수 없는 수가 나온다: ${paceMessage(fast)}`)
else ok('빠르면 여유를 알려 준다', paceMessage(fast))

// 4-1) 초반 과속(문항당 1초)에서도 읽을 수 있는 말이어야 한다 — 실측에서 '여유 4182%'가 나왔다
const blazing = at(5, 1)
if (/\d{3,}%/.test(paceMessage(blazing))) bad('초반 과속 표현', paceMessage(blazing))
else ok('초반 과속에서도 읽을 수 있는 말을 한다', paceMessage(blazing))

// 5) 다 풀면 경고하지 않는다
const done = computePace(TOTAL, TOTAL, EXAM - 60, 60)
if (done.kind === 'ontrack') ok('다 풀면 경고하지 않는다')
else bad('완료 상태', `${done.kind}로 판정`)

// 6) 시간이 거의 없으면 반드시 경고한다 (조용히 넘어가면 안 되는 자리)
const nearlyOut = computePace(20, TOTAL, EXAM - 120, 120)
if (nearlyOut.kind === 'behind') ok('시간이 2분 남고 절반만 풀었으면 경고한다', paceMessage(nearlyOut))
else bad('막판 경고', `${nearlyOut.kind} — 못 끝내는데 조용하다`)

// 7) 이상한 입력에도 죽지 않는다
for (const [a, t, e, l] of [[5, 0, 100, 100], [5, 100, 0, 100], [-1, 100, 100, 100]]) {
  try { computePace(a, t, e, l) } catch (err) { bad('이상한 입력', `${a},${t},${e},${l} → ${err}`) }
}
ok('이상한 입력에도 죽지 않는다')

console.log(failed ? '\n속도 안내가 틀린 말을 한다.' : '\n속도 안내는 맞는 말을 한다.')
process.exit(failed ? 1 : 0)
