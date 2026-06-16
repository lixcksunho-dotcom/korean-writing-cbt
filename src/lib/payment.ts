import { createAdminClient } from '@/lib/supabase/admin'

// 구독 1개월 가격(원). 클라이언트가 보내온 금액을 신뢰하지 않고
// 포트원 서버 조회 결과가 이 값과 일치하는지 반드시 검증한다.
// success 페이지 / 웹훅 / 관리자 재발급이 모두 이 상수와 함수를 공유한다.
export const PLAN_PRICE = 5500

export type PortonePayment = {
  status?: string
  amount?: { total?: number }
  pgTxId?: string
  // 결제 시 customer.customerId로 보낸 값을 포트원은 단건조회 응답에서 customer.id로 돌려준다.
  customer?: { id?: string; customerId?: string }
}

export type GrantReason =
  | 'not_found'   // 포트원에 해당 결제건 없음 / 조회 실패
  | 'status'      // 결제 상태가 PAID 아님
  | 'amount'      // 결제 금액이 정가와 불일치
  | 'no_user'     // 결제건에 customerId(=userId)가 없음
  | 'user_mismatch' // 로그인 사용자와 결제 customerId 불일치
  | 'save'        // 구독 insert 실패(23505 외)

export type GrantResult =
  | { ok: true; alreadyGranted: boolean; userId: string; expiresAt: string }
  | { ok: false; reason: GrantReason; status?: string; amount?: number }

/** 포트원 단건조회 — 실제 결제 사실을 서버에서 확인(브라우저 정보 불신). */
export async function fetchPortonePayment(paymentId: string): Promise<PortonePayment | null> {
  const res = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` },
      cache: 'no-store',
    },
  )
  if (!res.ok) return null
  return (await res.json()) as PortonePayment
}

/**
 * 결제건을 검증하고 구독을 발급한다. success 페이지·웹훅·관리자 복구가 공유하는 단일 진실 소스.
 * order_id(=paymentId) UNIQUE + 23505 처리로 어느 경로에서 와도 멱등(1건만 발급).
 *
 * @param opts.expectedUserId 주어지면 결제 customerId와 일치하는지 교차검증(success 페이지용).
 */
export async function grantSubscriptionForPayment(
  paymentId: string,
  opts: { expectedUserId?: string } = {},
): Promise<GrantResult> {
  const payment = await fetchPortonePayment(paymentId)
  if (!payment) return { ok: false, reason: 'not_found' }

  if (payment.status !== 'PAID') {
    return { ok: false, reason: 'status', status: payment.status }
  }

  const amount = Number(payment.amount?.total)
  if (amount !== PLAN_PRICE) {
    return { ok: false, reason: 'amount', amount }
  }

  // 웹훅엔 세션이 없으므로 결제 시 실어보낸 customerId(=userId)로 사용자를 해석한다.
  // 포트원 단건조회는 이 값을 customer.id로 반환한다(customerId는 폴백).
  const userId = payment.customer?.id ?? payment.customer?.customerId
  if (!userId) return { ok: false, reason: 'no_user' }
  if (opts.expectedUserId && opts.expectedUserId !== userId) {
    return { ok: false, reason: 'user_mismatch' }
  }

  const admin = createAdminClient()
  const expires = new Date()
  expires.setDate(expires.getDate() + 30)
  const expiresAt = expires.toISOString()

  const { error } = await admin.from('subscriptions').insert({
    user_id: userId,
    payment_key: payment.pgTxId ?? paymentId,
    order_id: paymentId,
    amount: PLAN_PRICE,
    status: 'active',
    expires_at: expiresAt,
  })

  if (error) {
    // 23505 = unique_violation: 이미 발급된 주문(새로고침·웹훅 중복 등) → 성공으로 처리.
    if (error.code === '23505') {
      const { data: existing } = await admin
        .from('subscriptions')
        .select('expires_at')
        .eq('order_id', paymentId)
        .maybeSingle()
      return { ok: true, alreadyGranted: true, userId, expiresAt: existing?.expires_at ?? expiresAt }
    }
    return { ok: false, reason: 'save' }
  }

  return { ok: true, alreadyGranted: false, userId, expiresAt }
}
