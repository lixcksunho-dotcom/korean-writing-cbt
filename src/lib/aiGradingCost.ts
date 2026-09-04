// AI 채점에 얼마가 나가는지 어림한다.
//
// 왜 필요한가: 유료 이용권은 5,500원에 **AI 채점 무제한**이다. 즉 한 사람이 많이 쓸수록
// 그 사람에게서 남는 돈이 줄고, 어느 지점을 넘으면 받은 돈보다 더 쓰게 된다.
// 그런데 지금 그 지점이 어디인지, 누가 거기에 가까운지 아무 데서도 안 보인다.
//
// 실측(최근 30일): 채점 252건 · 쓴 사람 19명 · 평균 13.3건 · 1인 최대 45건.
// 지금은 여유가 크지만, 쓰는 사람이 늘면 조용히 뒤집힌다 — 매출만 보고 있으면 못 본다.
//
// 정확한 청구액이 아니라 **자릿수**를 본다. 토큰 수를 우리가 기록하지 않으므로
// 호출 형태(입력 상한·max_tokens)에서 어림한다. 실제보다 넉넉히 잡아 안심하지 않게 한다.

/** 서술형 한 건에 오가는 토큰 어림. 입력은 문제+모범답안+답안, 출력은 max_tokens 상한. */
const ESSAY = { input: 2_000, output: 2_500 }
/** 원고지 한 건. 답안이 길고 출력 상한도 크다. */
const MANUSCRIPT = { input: 3_000, output: 4_000 }

/**
 * claude-sonnet 계열 100만 토큰당 달러. 값이 바뀌면 여기만 고친다.
 * 캐시 할인은 셈에 넣지 않는다 — 적게 잡으면 안심하게 되고, 그러면 보는 의미가 없다.
 */
const USD_PER_MTOK = { input: 3, output: 15 }

/** 원화 환산. 정확한 환율이 목적이 아니라 자릿수를 보는 것이다. */
export const KRW_PER_USD = 1_400

export type AiUsage = {
  essayCount: number
  manuscriptCount: number
  /** 사람별 채점 건수 — 많이 쓰는 사람이 누구인지 */
  perUser: { userId: string; count: number }[]
}

export type AiCost = {
  essayCount: number
  manuscriptCount: number
  totalCount: number
  /** 추정 원가(원) */
  krw: number
  /** 한 건당 추정 원가(원) */
  krwPerGrading: number
  /** 이 원가가 매출의 몇 %인가. 매출이 0이면 null. */
  shareOfRevenue: number | null
  /** 한 사람이 이 횟수를 넘기면 받은 5,500원을 넘어선다 */
  breakEvenCount: number
  /** 손익분기에 가까운 사람들 */
  heavy: { userId: string; count: number; krw: number; overBreakEven: boolean }[]
}

const costOf = (n: number, t: { input: number; output: number }) =>
  n * ((t.input / 1_000_000) * USD_PER_MTOK.input + (t.output / 1_000_000) * USD_PER_MTOK.output) * KRW_PER_USD

/**
 * @param usage  기간 내 채점 실적
 * @param revenueKrw 같은 기간 매출(원). 0이면 비율은 null.
 * @param pricePerSeat 1인당 받는 돈 — 손익분기 횟수를 여기서 낸다
 */
export function summarizeAiCost(usage: AiUsage, revenueKrw: number, pricePerSeat = 5_500): AiCost {
  const essay = costOf(usage.essayCount, ESSAY)
  const manuscript = costOf(usage.manuscriptCount, MANUSCRIPT)
  const krw = Math.round(essay + manuscript)
  const totalCount = usage.essayCount + usage.manuscriptCount
  const perGrading = totalCount ? Math.round(krw / totalCount) : Math.round(costOf(1, ESSAY))

  // 서술형 기준으로 잡는다 — 대부분이 서술형이고, 원고지는 더 비싸서 이 값이 보수적이다.
  const breakEvenCount = Math.max(1, Math.floor(pricePerSeat / Math.max(1, Math.round(costOf(1, ESSAY)))))

  const heavy = [...usage.perUser]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(u => ({
      userId: u.userId,
      count: u.count,
      krw: Math.round(costOf(u.count, ESSAY)),
      overBreakEven: u.count > breakEvenCount,
    }))

  return {
    essayCount: usage.essayCount,
    manuscriptCount: usage.manuscriptCount,
    totalCount,
    krw,
    krwPerGrading: perGrading,
    shareOfRevenue: revenueKrw > 0 ? Math.round((krw / revenueKrw) * 1000) / 10 : null,
    breakEvenCount,
    heavy,
  }
}
