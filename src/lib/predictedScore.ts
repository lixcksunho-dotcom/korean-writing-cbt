// 예상 점수 추정 — 대시보드·관리자 통계가 같은 계산을 쓴다.
//
// 왜 따로 두는가: 예전에는 대시보드와 유료회원 통계가 각자 계산했고, 둘 다 **서술형을 아직
// 안 받은 사람의 서술형 득점률을 객관식 정답률로 대신**했다. 그 대체가 얼마나 틀리는지
// 실제 데이터로 재 봤다(2026-09-08, 서술형이 100점어치 이상 채점된 57회차):
//
//   · 객관식률 평균 85.6% / 서술형률 평균 63.9% — 서술형이 20%p 낮다
//   · 둘의 상관 r = 0.20 (거의 무관)
//   · 서술형률을 객관식률로 대신했을 때 평균오차 22.2%p → 700점 환산 155점
//   · 전체 평균(63.9%)으로 대신했을 때 평균오차  8.2%p → 700점 환산  57점
//
// 즉 "객관식을 잘 보면 서술형도 잘 본다"는 가정에 근거가 없었고, 그 가정 때문에 서술형을
// 안 받은 사람의 점수가 100점 넘게 부풀어 있었다. 그래서 (1) 모르면 평균을 쓰고,
// (2) 조금 아는 만큼만 그 사람 값으로 옮겨 가고, (3) 얼마나 모르는지를 범위로 함께 말한다.

/** 서술형 평균 득점률(실측 2026-09-08 · 57회차). 이 값이 실제와 멀어지면 check:predicted-score 가 알려 준다. */
export const ESSAY_BASELINE_RATE = 0.639
/** 서술형 득점률의 전체 표준편차(실측). 아직 아무것도 모르는 사람의 '모르는 폭'이다. */
export const ESSAY_TOTAL_SD = 0.102
/** 같은 사람 안에서 회차마다 흔들리는 폭(실측 4.9%p) — 채점을 받아도 남는 흔들림이다. */
export const ESSAY_WITHIN_SD = 0.049

/**
 * 이만큼(배점 합)이 채점되면 그 사람 값을 절반쯤 믿는다.
 *
 * 사람 사이 차이(7.6%p)가 사람 안 흔들림(4.9%p)보다 크므로 한 회차만 채점돼도 그 사람 값에
 * 무게를 크게 둘 수 있다 — 한 회차(700점)에서 비중 0.7이 되도록 잡았다.
 */
export const ESSAY_SHRINK_POINTS = 300

/** 95% 범위를 만들 때 쓰는 계수 */
const Z95 = 1.96

export type EssayGrade = { aiScore: number | null; points: number | null }

export type Prediction = {
  /** 만점 환산 예상 점수 */
  score: number
  /** 95% 범위 — '이 사이 어딘가'라고 말할 수 있는 폭 */
  low: number
  high: number
  objectiveRate: number
  objectiveAnswered: number
  objectivePart: number
  /** 실제로 쓴 서술형 득점률(축소 반영) */
  essayRate: number
  essayPart: number
  /** 채점된 서술형 배점 합 */
  essayGradedPoints: number
  /** 서술형을 그 사람 값으로 본 비중(0~1) */
  essayOwnWeight: number
  /** own=거의 그 사람 값 · mixed=섞음 · baseline=아직 평균 */
  basis: 'own' | 'mixed' | 'baseline'
}

/** 채점된 서술형에서 그 사람의 득점률을 낸다. 배점이 30~300점으로 달라 배점으로 가중한다. */
export function essayOwnRate(essays: EssayGrade[]): { rate: number | null; points: number } {
  let got = 0
  let max = 0
  for (const e of essays) {
    if (e.aiScore == null || !e.points) continue
    got += e.aiScore
    max += e.points
  }
  return { rate: max > 0 ? got / max : null, points: max }
}

/**
 * 예상 점수와 그 범위.
 *
 * @param objectiveCorrect  객관식 맞은 문항 수(전 회차 합)
 * @param objectiveAnswered 객관식 푼 문항 수(전 회차 합). 0이면 아직 셀 것이 없다.
 * @param essays            AI 채점된 서술형 답안들
 * @param weight            시험 배점(실용글쓰기 객300·서700)
 */
export function predictScore(input: {
  objectiveCorrect: number
  objectiveAnswered: number
  essays: EssayGrade[]
  weight: { objective: number; essay: number }
  maxScore?: number
}): Prediction | null {
  const { objectiveCorrect, objectiveAnswered, essays, weight } = input
  if (!objectiveAnswered) return null
  const maxScore = input.maxScore ?? weight.objective + weight.essay

  const objectiveRate = Math.min(1, Math.max(0, objectiveCorrect / objectiveAnswered))

  // 서술형이 없는 시험(KBS 990/0)은 모르는 것이 없다 — '서술형을 받으세요' 안내가 뜨면 안 된다.
  const noEssaySection = weight.essay === 0

  const own = essayOwnRate(essays)
  // 채점된 배점이 많을수록 그 사람 값으로 옮겨 간다. 하나도 없으면 통째로 평균이다.
  const w = noEssaySection ? 1 : own.rate == null ? 0 : own.points / (own.points + ESSAY_SHRINK_POINTS)
  const essayRate = noEssaySection ? 0 : own.rate == null ? ESSAY_BASELINE_RATE : w * own.rate + (1 - w) * ESSAY_BASELINE_RATE

  const objectivePart = objectiveRate * weight.objective
  const essayPart = essayRate * weight.essay
  const score = Math.round(objectivePart + essayPart)

  // 범위: 객관식은 표본(문항 수)에서 오는 흔들림, 서술형은 '아직 모르는 만큼'.
  const seObj = Math.sqrt(Math.max(objectiveRate * (1 - objectiveRate), 0.01) / objectiveAnswered)
  const effRounds = own.points > 0 ? Math.max(1, own.points / (weight.essay || 700)) : 1
  const seEssay = Math.sqrt(
    (1 - w) ** 2 * ESSAY_TOTAL_SD ** 2 + w ** 2 * (ESSAY_WITHIN_SD ** 2 / effRounds),
  )
  const half = Z95 * Math.sqrt((seObj * weight.objective) ** 2 + (seEssay * weight.essay) ** 2)

  return {
    score,
    low: Math.max(0, Math.round(score - half)),
    high: Math.min(maxScore, Math.round(score + half)),
    objectiveRate,
    objectiveAnswered,
    objectivePart: Math.round(objectivePart),
    essayRate,
    essayPart: Math.round(essayPart),
    essayGradedPoints: own.points,
    essayOwnWeight: w,
    basis: w >= 0.6 ? 'own' : w > 0 ? 'mixed' : 'baseline',
  }
}

/** 화면에 한 줄로 적을 말 — 지금 숫자가 무엇에 기대고 있는지 밝힌다. */
export function predictionBasisLabel(p: Prediction): string {
  // 서술형이 없는 시험(KBS)은 '채점을 받으세요'가 할 말이 아니다.
  if (p.essayPart === 0 && p.essayGradedPoints === 0) return '객관식 정답률을 만점 기준으로 환산한 값이에요.'
  if (p.basis === 'own') return '서술형 AI 채점 결과를 반영한 값이에요.'
  if (p.basis === 'mixed') return '서술형은 지금까지 받은 채점과 평균을 함께 봤어요. 더 받을수록 정확해져요.'
  return '서술형을 아직 안 받아 다른 분들의 평균으로 잡았어요. 한 번만 받아도 훨씬 정확해져요.'
}
