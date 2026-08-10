// 환불 정책이 정한 기준을 코드로 옮긴 것. /refund 문서와 짝을 이룬다.
//
// 왜 필요한가: 정책은 "결제 후 7일 이내이고 AI 채점·분석을 1회도 사용하지 않은 경우
// 전액 환불"이라고 약속한다. 그런데 관리자 화면에는 회원의 AI 사용 여부가 어디에도
// 없었다. 환불 문의가 오면 사장님이 **자기 정책의 판단 기준을 확인할 방법이 없다** —
// DB를 직접 뒤지거나, 감으로 답하거나 둘 중 하나가 된다. 감으로 답하면 어떤 사람은
// 받고 어떤 사람은 못 받는다.
//
// 판정은 순수 함수로 둔다(now를 받는다). 그래야 경계값을 검사로 고정할 수 있고,
// 렌더 중에 Date.now()를 부르지 않는다(react-hooks/purity).

export const REFUND_WINDOW_DAYS = 7

export type RefundVerdict =
  | 'refundable' // 7일 이내 + 미사용 → 정책상 전액 환불
  | 'used' // 사용 시작 → 청약철회 제한 가능
  | 'window_over' // 7일 경과
  | 'no_payment' // 결제 이력 없음

export type RefundJudgement = {
  verdict: RefundVerdict
  /** 관리자 화면에 그대로 쓰는 짧은 말 */
  label: string
  /** 결제 후 며칠 지났는지(결제일 당일이 0). 결제가 없으면 null */
  daysSincePaid: number | null
}

/**
 * @param paidAt 가장 최근 결제(이용권 시작) 시각. 없으면 null.
 * @param gradeCount 그 결제 이후 AI 채점 사용 횟수.
 */
export const NO_PAYMENT: RefundJudgement = { verdict: 'no_payment', label: '결제 없음', daysSincePaid: null }

export function judgeRefund(
  paidAt: string | null,
  gradeCount: number,
  now: number
): RefundJudgement {
  if (!paidAt) return NO_PAYMENT

  const paid = new Date(paidAt).getTime()
  if (!Number.isFinite(paid)) return NO_PAYMENT

  const days = Math.floor((now - paid) / 86400_000)

  // 사용 여부가 먼저다. 정책의 두 조건은 AND이고, 한 번이라도 썼으면 7일 이내여도
  // '미사용 환불' 대상이 아니다.
  if (gradeCount > 0) return { verdict: 'used', label: `AI ${gradeCount}회 사용`, daysSincePaid: days }
  if (days >= REFUND_WINDOW_DAYS) return { verdict: 'window_over', label: `미사용 · ${days}일 경과`, daysSincePaid: days }
  return { verdict: 'refundable', label: `미사용 · ${REFUND_WINDOW_DAYS - days}일 남음`, daysSincePaid: days }
}
