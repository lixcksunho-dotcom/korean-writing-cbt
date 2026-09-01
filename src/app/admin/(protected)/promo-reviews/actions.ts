'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveSubscription } from '@/lib/subscription'
import { REWARD_DAYS } from '@/lib/blogPromoRules'
import { revalidatePath } from 'next/cache'

export type ApproveResult = { ok: true; expiresAt: string } | { ok: false; message: string }

/**
 * 블로그 홍보 신청을 승인하고 그 자리에서 이용권을 지급한다.
 *
 * 승인과 지급이 갈리면 '승인은 했는데 이용권이 안 나간' 상태가 조용히 생긴다.
 * 그래서 지급이 성공한 뒤에만 처리 완료로 표시한다.
 */
export async function approveBlogReview(feedbackId: string): Promise<ApproveResult> {
  const admin = createAdminClient()

  const { data: row } = await admin
    .from('feedback')
    .select('id, user_id, contact, resolved')
    .eq('id', feedbackId)
    .maybeSingle()
  if (!row?.user_id) return { ok: false, message: '신청을 찾지 못했습니다(비회원 신청은 지급할 수 없습니다).' }
  if (row.resolved) return { ok: false, message: '이미 처리된 신청입니다.' }

  // 이미 이용권이 있으면 남은 기간 뒤에 이어 붙인다 — 겹쳐 주면 돈 낸 사람이 손해다.
  const current = await getActiveSubscription(row.user_id)
  const base = current ? new Date(current.expires_at) : new Date()
  const expiresAt = new Date(base.getTime() + REWARD_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await admin.from('subscriptions').insert({
    user_id: row.user_id,
    payment_key: 'promo:blog-review',
    // 신청 한 건당 한 번만 지급된다 — order_id의 unique 제약이 중복 승인을 막는다.
    order_id: `review-${row.id}`,
    amount: 0,
    status: 'active',
    expires_at: expiresAt,
  })
  if (error) {
    if (error.code === '23505') return { ok: false, message: '이 신청은 이미 지급됐습니다.' }
    return { ok: false, message: `지급 실패: ${error.message}` }
  }

  // 지급이 끝난 뒤에 처리 완료로 바꾼다(순서를 바꾸면 '승인했는데 안 나감'이 생긴다).
  await admin.from('feedback').update({ resolved: true }).eq('id', row.id)

  revalidatePath('/admin/promo-reviews')
  return { ok: true, expiresAt }
}

/** 조건 미달로 돌려보낸다. 지급은 없고 접수만 닫는다. */
export async function rejectBlogReview(feedbackId: string): Promise<{ ok: boolean }> {
  const admin = createAdminClient()
  await admin.from('feedback').update({ resolved: true }).eq('id', feedbackId)
  revalidatePath('/admin/promo-reviews')
  return { ok: true }
}
