// 환불된 결제의 이용권을 회수할지 정한다(순수 판정 — 네트워크·DB 없음).
//
// 왜 필요한가: 2026-06-19 결제 한 건이 포트원에서 취소(전액 환불)됐는데
// subscriptions 행은 status='active' 그대로 남아 있었다. 만료일이 지나 실피해는
// 없었지만, 환불하고도 30일을 계속 쓸 수 있는 통로가 열려 있었다는 뜻이다.
// 발급(grantSubscriptionForPayment)에는 웹훅·success·관리자 세 경로가 있는데
// 회수에는 아무 경로도 없었다.
//
// 판정을 순수 함수로 떼어 둔 이유: 돈이 걸린 규칙이라 네트워크 없이 표로 검증해야 한다.
//   npm run check:revoke

/** 이용권이 살아 있는지 가르는 값. subscription.status가 이 값일 때만 유료 회차가 열린다. */
export const ACTIVE = 'active'
/** 회수된 이용권의 상태값(스키마 CHECK 제약이 허용하는 두 값 중 하나). */
export const REVOKED = 'cancelled'

export type RevocationAction =
  | 'revoke'          // 전액 취소 확인 → 지금 회수
  | 'keep'            // 결제가 살아 있음 → 그대로 둔다
  | 'already_revoked' // 이미 회수됨 → 멱등(웹훅 재시도·중복 수신)
  | 'no_subscription' // 그 결제로 발급된 이용권이 없음(발급 전 취소 등)
  | 'review'          // 자동으로 정하면 안 되는 상태 → 운영자에게 알린다

export type RevocationDecision = { action: RevocationAction; reason: string }

/**
 * @param paymentStatus 포트원 **서버 조회**로 받은 결제 상태. 웹훅 본문의 값을 쓰지 않는다
 *                      — 발급 쪽과 같은 원칙(브라우저·웹훅 페이로드 불신, 서버가 사실을 확인).
 * @param subscription  order_id로 찾은 이용권. 없으면 null.
 */
export function decideRevocation(input: {
  paymentStatus?: string
  subscription: { status: string } | null
}): RevocationDecision {
  const { paymentStatus, subscription } = input

  if (!subscription) {
    return { action: 'no_subscription', reason: '그 주문번호로 발급된 이용권이 없다' }
  }
  if (subscription.status !== ACTIVE) {
    return { action: 'already_revoked', reason: `이용권이 이미 ${subscription.status} 상태다` }
  }

  switch (paymentStatus) {
    case 'CANCELLED':
      return { action: 'revoke', reason: '결제가 전액 취소됐다' }

    // 부분 취소는 자동으로 정하지 않는다. 500원을 돌려준 호의 환불과, 사실상 전액에
    // 가까운 환불을 금액만 보고 가를 수 없고 — 둘 다 이 제품엔 화면이 없어 콘솔에서
    // 사람이 한 일이다 — 잘못 회수하면 돈 낸 사람의 이용권을 뺏는다.
    case 'PARTIAL_CANCELLED':
      return { action: 'review', reason: '부분 취소 — 얼마를 돌려줬는지 보고 사람이 정해야 한다' }

    case 'PAID':
      return { action: 'keep', reason: '결제가 여전히 유효하다' }

    case undefined:
    case '':
      return { action: 'review', reason: '결제 상태를 읽지 못했다' }

    // READY·FAILED 등: 결제되지 않은 건에 이용권이 붙어 있다는 뜻이라 정상이 아니다.
    // 다만 자동 회수하기엔 근거가 약하다(발급은 PAID에서만 일어나므로, 여기 오면
    // 수동 발급이거나 포트원 쪽 상태가 우리가 모르는 값이다) → 사람이 본다.
    default:
      return { action: 'review', reason: `결제 상태가 ${paymentStatus} — 이용권이 붙어 있을 상태가 아니다` }
  }
}
