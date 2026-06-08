// 모의고사 회차 접근 정책: 1~2회는 무료, 3회부터는 구독(이용권) 필요.
export const FREE_EXAM_ROUNDS = 2

/** 해당 회차가 비구독자에게 잠겨 있는지 */
export function isRoundLocked(round: number, hasSubscription: boolean): boolean {
  return round > FREE_EXAM_ROUNDS && !hasSubscription
}
