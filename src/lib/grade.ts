// 시험 등급 체계. 시험별 만점·등급컷은 src/lib/programs.ts 설정에서 가져온다.
// 기존 호출부(실용글쓰기)는 program 인자 없이 그대로 동작한다(default = silyong).

import { getProgram, type ProgramId, type GradeCut } from './programs'

export type Tier = {
  name: string
  color: string // tailwind 색 계열 키
}

/** 획득 점수와 총점을 해당 시험의 만점으로 환산한 점수를 반환 */
export function scaleToMax(earned: number, total: number, program?: ProgramId): number {
  if (total <= 0) return 0
  const max = getProgram(program).maxScore
  return Math.round((earned / total) * max)
}

/** [레거시 호환] 1000점(실용글쓰기) 환산 — 기존 호출부 유지용 */
export function scaleTo1000(earned: number, total: number): number {
  return scaleToMax(earned, total, 'silyong')
}

/** 환산 점수로 등급 판정 (시험별 등급컷 적용) */
export function tierFor(scaledScore: number, program?: ProgramId): Tier {
  const cfg = getProgram(program)
  for (const c of cfg.cuts) {
    if (scaledScore >= c.min) return { name: c.name, color: c.color }
  }
  return { name: cfg.belowLabel, color: 'slate' }
}

/** [레거시 호환] 실용글쓰기 등급컷 테이블 */
export const TIER_TABLE: GradeCut[] = getProgram('silyong').cuts
