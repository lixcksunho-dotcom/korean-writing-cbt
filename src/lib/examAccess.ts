// 모의고사 회차 접근 정책: 무료 회차 이하는 무료, 그 이후는 구독(이용권) 필요.
// 무료 회차 수는 시험별로 다를 수 있어 src/lib/programs.ts 설정에서 가져온다.
import { getProgram, type ProgramId } from './programs'

// [레거시] 실용글쓰기 무료 회차 수(2). 기존 참조 호환용.
export const FREE_EXAM_ROUNDS = 2

/** 해당 회차가 비구독자에게 잠겨 있는지 (program 미지정 시 실용글쓰기 정책) */
export function isRoundLocked(
  round: number,
  hasSubscription: boolean,
  program?: ProgramId,
): boolean {
  const free = getProgram(program).freeRounds
  return round > free && !hasSubscription
}
