import { createAdminClient } from '@/lib/supabase/admin'
import { fetchPortonePayment } from '@/lib/payment'
import { recordOperatorAlert } from '@/lib/operatorAlerts'
import { ACTIVE, REVOKED, decideRevocation, type RevocationAction } from '@/lib/subscriptionRevocationPolicy'

// 환불된 결제의 이용권을 회수한다. 발급(grantSubscriptionForPayment)의 짝이며,
// 웹훅(Transaction.Cancelled)과 대사 스크립트(scripts/revoke_refunded_subscriptions.mjs)가 공유한다.
//
// 만료일(expires_at)은 건드리지 않는다 — 언제까지 쓸 수 있던 건이었는지는 기록으로 남기고,
// 실제 문은 status로 닫는다(getActiveSubscription·isActivePass가 status='active'만 통과시킨다).

export type RevokeResult =
  | { ok: true; action: RevocationAction; reason: string; userId?: string }
  | { ok: false; reason: 'not_found' | 'lookup_failed' | 'save'; httpStatus?: number }

export async function revokeSubscriptionForPayment(paymentId: string): Promise<RevokeResult> {
  const { payment, httpStatus } = await fetchPortonePayment(paymentId)
  if (!payment) {
    return { ok: false, reason: httpStatus === 404 ? 'not_found' : 'lookup_failed', httpStatus }
  }

  const admin = createAdminClient()
  const { data: sub, error: readError } = await admin
    .from('subscriptions')
    .select('id, user_id, status')
    .eq('order_id', paymentId)
    .maybeSingle()

  // 조회 실패를 '이용권 없음'으로 읽으면 회수해야 할 건을 조용히 넘긴다 → 재시도 대상.
  if (readError) return { ok: false, reason: 'save' }

  const decision = decideRevocation({ paymentStatus: payment.status, subscription: sub })

  if (decision.action === 'review') {
    await recordOperatorAlert(
      'payment',
      `환불 처리 확인 필요: ${decision.reason} (주문 ${paymentId})`,
      paymentId,
    )
    return { ok: true, action: 'review', reason: decision.reason, userId: sub?.user_id }
  }

  if (decision.action !== 'revoke') {
    return { ok: true, action: decision.action, reason: decision.reason, userId: sub?.user_id }
  }

  // status='active'를 조건에 남겨 동시 수신(웹훅 중복·대사 동시 실행)에도 한 번만 바뀌게 한다.
  // select()로 실제 바뀐 행을 받아 본다 — supabase-js는 0행 갱신도 성공으로 돌려주므로,
  // 결과를 안 보면 '회수했다'는 로그만 남고 이용권은 그대로 살아 있을 수 있다.
  const { data: updated, error } = await admin
    .from('subscriptions')
    .update({ status: REVOKED })
    .eq('order_id', paymentId)
    .eq('status', ACTIVE)
    .select('id, user_id')

  if (error) {
    await recordOperatorAlert(
      'payment',
      `환불된 결제의 이용권 회수 실패 — 환불하고도 계속 이용 중일 수 있다 (주문 ${paymentId})`,
      paymentId,
    )
    return { ok: false, reason: 'save' }
  }

  if (!updated?.length) {
    // 방금 다른 경로가 회수했다(경합). 사고가 아니다.
    return { ok: true, action: 'already_revoked', reason: '다른 경로가 먼저 회수했다', userId: sub?.user_id }
  }

  return { ok: true, action: 'revoke', reason: decision.reason, userId: updated[0].user_id }
}
