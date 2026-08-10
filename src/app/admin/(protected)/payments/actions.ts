'use server'

import { createClient } from '@/lib/supabase/server'
import { grantSubscriptionForPayment, type GrantReason } from '@/lib/payment'
import { revalidatePath } from 'next/cache'

// 서버 액션은 레이아웃 가드와 별개이므로 호출 시마다 관리자 권한을 재확인한다.
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user || !adminEmails.includes(user.email ?? '')) throw new Error('Forbidden')
}

const REASON_MSG: Record<GrantReason, string> = {
  not_found: '포트원에 그런 주문번호가 없습니다. (paymentId 확인)',
  lookup_failed: '포트원 조회에 실패했습니다. 잠시 후 다시 시도하세요(장애·API 키 확인).',
  status: '결제 상태가 PAID(완료)가 아닙니다.',
  amount: '결제 금액이 정가와 일치하지 않습니다.',
  no_user: '결제건에 사용자 정보(customerId)가 없습니다.',
  user_mismatch: '결제 사용자와 대상이 일치하지 않습니다.',
  save: '구독 저장에 실패했습니다.',
}

/** 이미 결제(PAID)됐는데 구독이 미발급된 건을 관리자가 재발급한다. */
export async function reconcilePayment(paymentId: string): Promise<{ ok: boolean; message: string }> {
  await assertAdmin()
  const id = (paymentId ?? '').trim()
  if (!id) return { ok: false, message: 'paymentId를 입력하세요.' }

  const result = await grantSubscriptionForPayment(id)
  revalidatePath('/admin/payments')

  if (result.ok) {
    return {
      ok: true,
      message: result.alreadyGranted
        ? `이미 발급된 구독입니다. (user ${result.userId})`
        : `구독 발급 완료 ✓ (user ${result.userId})`,
    }
  }
  return { ok: false, message: REASON_MSG[result.reason] ?? '발급에 실패했습니다.' }
}
