// 다 푼 사람에게 '다음은 이 회차'를 정해 준다.
//
// 왜 필요한가: 결과 화면에 '다시 풀기(같은 회차)'와 '대시보드'만 있었다. 방금 한 회차를
// 끝낸 사람에게 가장 좋은 다음 행동은 **다른 회차를 푸는 것**인데, 그 자리가 없었다.
// 실제로 두 번 이상 푼 사람이 0명이다 — 길이 없으면 아무도 안 간다.
//
// 결과 화면 직후가 의욕이 가장 높은 자리다. 여기서 다음을 안 정해 주면 대시보드로 가서
// 무엇을 할지 고르다가 그냥 나간다.

export type RoundRef = { year: number; round: number }

export type NextRound =
  | { kind: 'next'; year: number; round: number; doneCount: number; total: number }
  /** 다 풀었다 — 그때는 다른 것을 권해야 한다(오답 복습·유형별 연습). */
  | { kind: 'allDone'; doneCount: number; total: number }

const key = (r: RoundRef) => `${r.year}-${r.round}`

/**
 * @param allRounds   풀 수 있는 회차 전체(순서대로)
 * @param completed   그 사람이 끝낸 회차들
 * @param justFinished 방금 끝낸 회차 — 이건 '다음'으로 다시 권하지 않는다
 */
export function nextRoundToTake(
  allRounds: RoundRef[],
  completed: RoundRef[],
  justFinished?: RoundRef,
): NextRound {
  const done = new Set(completed.map(key))
  if (justFinished) done.add(key(justFinished))

  const remaining = allRounds.filter(r => !done.has(key(r)))
  const doneCount = allRounds.filter(r => done.has(key(r))).length

  if (remaining.length === 0) return { kind: 'allDone', doneCount, total: allRounds.length }
  // 앞에서부터 권한다 — 회차 번호는 난이도가 아니라 순서다.
  return { kind: 'next', year: remaining[0].year, round: remaining[0].round, doneCount, total: allRounds.length }
}
