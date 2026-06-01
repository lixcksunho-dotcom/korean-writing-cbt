// 한국실용글쓰기검정 등급 체계 (개편 후, 1000점 만점 기준)
// 1급 870 / 2급 790 / 준2급 710 / 3급 630 / 준3급 550 이상

export type Tier = {
  name: string
  color: string // tailwind 색 계열 키
}

const CUTS: { min: number; name: string; color: string }[] = [
  { min: 870, name: '1급', color: 'emerald' },
  { min: 790, name: '2급', color: 'emerald' },
  { min: 710, name: '준2급', color: 'blue' },
  { min: 630, name: '3급', color: 'blue' },
  { min: 550, name: '준3급', color: 'amber' },
]

/** 획득 점수와 총점을 받아 1000점 만점으로 환산한 점수를 반환 */
export function scaleTo1000(earned: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((earned / total) * 1000)
}

/** 1000점 환산 점수로 등급 판정 */
export function tierFor(scaledScore: number): Tier {
  for (const c of CUTS) {
    if (scaledScore >= c.min) return { name: c.name, color: c.color }
  }
  return { name: '미달', color: 'slate' }
}

export const TIER_TABLE = CUTS
