// 한 회차를 끝낸 사람에게 '다음은 이 회차'가 보이는지 본다.
//   npm run check:next-round
//
// 왜 필요한가: 두 번 이상 푼 사람이 0명이었다. 결과 화면에 '같은 회차 다시 풀기'와
// '대시보드'만 있어서, 방금 한 회차를 끝낸 사람이 다음으로 갈 길이 없었다.
// 결과 화면 직후가 의욕이 가장 높은 자리다 — 여기서 다음을 안 정해 주면 그냥 나간다.
//
// 검사가 만든 계정·세션만 지운다.

import fs from 'node:fs'
import { nextRoundToTake } from '../src/lib/nextRoundToTake.ts'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log('\n다음 회차 안내\n')

const rounds = [1, 2, 3, 4, 5].map(round => ({ year: 2025, round }))

// ── 순수 판정 ──────────────────────────────────────────────────────────────
{
  const r = nextRoundToTake(rounds, [], { year: 2025, round: 1 })
  if (r.kind === 'next' && r.round === 2) ok('1회차를 끝내면 2회차를 권한다', `${r.doneCount}/${r.total}`)
  else bad('다음 회차', JSON.stringify(r))

  // 방금 푼 회차를 다시 권하면 '다시 풀기'와 같은 말이 된다
  const again = nextRoundToTake(rounds, [{ year: 2025, round: 1 }], { year: 2025, round: 1 })
  if (again.kind === 'next' && again.round !== 1) ok('방금 푼 회차는 다시 권하지 않는다', `${again.round}회차`)
  else bad('중복 권유', JSON.stringify(again))

  // 건너뛴 회차가 있으면 그 앞 것부터 — 회차 번호는 난이도가 아니라 순서다
  const skipped = nextRoundToTake(rounds, [{ year: 2025, round: 3 }], { year: 2025, round: 5 })
  if (skipped.kind === 'next' && skipped.round === 1) ok('건너뛴 회차를 앞에서부터 채운다', `${skipped.round}회차`)
  else bad('건너뛴 회차', JSON.stringify(skipped))

  const all = nextRoundToTake(rounds, rounds, { year: 2025, round: 5 })
  if (all.kind === 'allDone' && all.doneCount === 5) ok('다 풀면 다른 것을 권한다', '오답·약점 반복')
  else bad('전부 완료', JSON.stringify(all))

  const one = nextRoundToTake([{ year: 2025, round: 1 }], [], { year: 2025, round: 1 })
  if (one.kind === 'allDone') ok('회차가 하나뿐이면 없는 회차를 지어내지 않는다')
  else bad('회차 하나', JSON.stringify(one))
}

// ── 화면에 실제로 붙어 있는가 ─────────────────────────────────────────────
{
  const page = fs.readFileSync('src/app/(main)/cbt/[examId]/result/page.tsx', 'utf8')
  if (page.includes('nextRoundToTake')) ok('결과 화면이 다음 회차를 계산한다')
  else bad('결과 화면 연결', '계산이 없다')
  if (page.includes('회차 풀어보기')) ok('결과 화면에 다음 회차 버튼이 있다')
  else bad('버튼', '누를 자리가 없다')
  // 완료한 회차를 알아야 '다음'을 정할 수 있다
  if (page.includes("not('completed_at', 'is', null)")) ok('끝낸 회차를 실제로 읽어서 정한다')
  else bad('완료 조회', '끝낸 회차를 안 보고 정한다')
}

console.log(`\n${fail ? '다음 회차 안내에 구멍이 있다.' : '끝낸 사람에게 다음을 준다.'}`)
process.exit(fail ? 1 : 0)
