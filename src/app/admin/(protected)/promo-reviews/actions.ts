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

/**
 * 지급을 되돌린다 — 글을 지웠거나 조건을 어긴 것이 확인됐을 때.
 *
 * 이용권 행을 지우지 않고 status만 바꾼다. 지우면 '왜 없어졌는지'가 사라져
 * 나중에 항의가 왔을 때 아무것도 못 밝힌다. 기록은 남기고 효력만 끊는다.
 *
 * status는 DB CHECK가 'active'|'cancelled' 두 값만 허용한다(004_subscriptions).
 * 'revoked'를 새로 넣으려면 마이그레이션이 필요하므로, 값은 'cancelled'를 쓰고
 * 회수라는 사실은 payment_key에 남긴다 — 결제 취소와 구분되어야 한다.
 */
export async function revokeBlogReview(feedbackId: string): Promise<{ ok: boolean; message: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('subscriptions')
    .update({ status: 'cancelled', payment_key: 'promo:blog-review:revoked' })
    .eq('order_id', `review-${feedbackId}`)
    .eq('status', 'active')
    .select('id')
  if (error) return { ok: false, message: `회수 실패: ${error.message}` }
  if (!data?.length) return { ok: false, message: '되돌릴 지급이 없습니다(이미 회수됐거나 자동 지급 건입니다).' }

  revalidatePath('/admin/promo-reviews')
  return { ok: true, message: '이용권을 회수했습니다.' }
}

/** 자동 지급분(계정당 1회)도 회수할 수 있어야 한다 — order_id 규칙이 다르다. */
export async function revokeAutoGrant(userId: string): Promise<{ ok: boolean; message: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('subscriptions')
    .update({ status: 'cancelled', payment_key: 'promo:blog-review:revoked' })
    .eq('order_id', `review-auto-${userId}`)
    .eq('status', 'active')
    .select('id')
  if (error) return { ok: false, message: `회수 실패: ${error.message}` }
  if (!data?.length) return { ok: false, message: '되돌릴 자동 지급이 없습니다.' }
  revalidatePath('/admin/promo-reviews')
  return { ok: true, message: '자동 지급분을 회수했습니다.' }
}
