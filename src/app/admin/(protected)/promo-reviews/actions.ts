'use server'

import { createClient } from '@/lib/supabase/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveSubscription } from '@/lib/subscription'
import { REWARD_DAYS, BLOG_REVIEW_PATH, GRANT_KEY, GRANT_KEY_VIOLATED, GRANT_KEY_REVOKED, GRANT_KEY_RESTORED } from '@/lib/blogPromoRules'
import { blogRewardQuota } from '@/lib/blogRewardQuota'
import { revalidatePath } from 'next/cache'

export type ApproveResult = { ok: true; expiresAt: string } | { ok: false; message: string }

/**
 * 블로그 홍보 신청을 승인하고 그 자리에서 이용권을 지급한다.
 *
 * 승인과 지급이 갈리면 '승인은 했는데 이용권이 안 나간' 상태가 조용히 생긴다.
 * 그래서 지급이 성공한 뒤에만 처리 완료로 표시한다.
 */
export async function approveBlogReview(feedbackId: string): Promise<ApproveResult> {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: row } = await admin
    .from('feedback')
    .select('id, user_id, contact, resolved')
    .eq('id', feedbackId)
    .maybeSingle()
  if (!row?.user_id) return { ok: false, message: '신청을 찾지 못했습니다(비회원 신청은 지급할 수 없습니다).' }
  if (row.resolved) return { ok: false, message: '이미 처리된 신청입니다.' }

  // 자동 지급과 같은 자리를 쓴다 — 여기서 안 막으면 한도를 우회하는 문이 하나 열린다.
  const quota = await blogRewardQuota()
  if (quota.closed) {
    return { ok: false, message: `선착순 ${quota.total}명이 마감됐습니다(${quota.used}/${quota.total}).` }
  }

  // 이미 이용권이 있으면 남은 기간 뒤에 이어 붙인다 — 겹쳐 주면 돈 낸 사람이 손해다.
  const current = await getActiveSubscription(row.user_id)
  const base = current ? new Date(current.expires_at) : new Date()
  const expiresAt = new Date(base.getTime() + REWARD_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await admin.from('subscriptions').insert({
    user_id: row.user_id,
    payment_key: GRANT_KEY,
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
  const { error: feedbackError } = await admin.from('feedback').update({ resolved: true }).eq('id', row.id)
  if (feedbackError) return { ok: false, message: `이용권 지급은 완료됐지만 처리 표시만 실패했습니다: ${feedbackError.message}` }

  revalidatePath('/admin/promo-reviews')
  return { ok: true, expiresAt }
}

/** 조건 미달로 돌려보낸다. 지급은 없고 접수만 닫는다. */
export async function rejectBlogReview(feedbackId: string): Promise<{ ok: boolean }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('feedback').update({ resolved: true }).eq('id', feedbackId)
  if (error) return { ok: false }
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
  await assertAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('subscriptions')
    .update({ status: 'cancelled', payment_key: GRANT_KEY_REVOKED })
    .eq('order_id', `review-${feedbackId}`)
    .eq('status', 'active')
    .select('id')
  if (error) return { ok: false, message: `회수 실패: ${error.message}` }
  if (data?.length) {
    revalidatePath('/admin/promo-reviews')
    return { ok: true, message: '이용권을 회수했습니다.' }
  }

  // 승인 지급이 없으면 자동 지급(order_id 가 review-auto-<user>)일 수 있다. 관리자는 신청 목록에서
  // 신청 id 만 쥐고 있으므로, 신청 행에서 user_id 를 찾아 같은 버튼으로 회수한다 — 따로 userId 를 알 필요 없게.
  const { data: fb } = await admin
    .from('feedback')
    .select('user_id, path')
    .eq('id', feedbackId)
    .maybeSingle()
  if (fb?.user_id && fb.path === BLOG_REVIEW_PATH) {
    const auto = await revokeAutoGrant(String(fb.user_id))
    if (auto.ok) return auto
  }
  return { ok: false, message: '되돌릴 지급이 없습니다(이미 회수됐거나 지급된 적이 없습니다).' }
}

/** 자동 지급분(계정당 1회)도 회수할 수 있어야 한다 — order_id 규칙이 다르다. */
export async function revokeAutoGrant(userId: string): Promise<{ ok: boolean; message: string }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('subscriptions')
    .update({ status: 'cancelled', payment_key: GRANT_KEY_REVOKED })
    .eq('order_id', `review-auto-${userId}`)
    .eq('status', 'active')
    .select('id')
  if (error) return { ok: false, message: `회수 실패: ${error.message}` }
  if (!data?.length) return { ok: false, message: '되돌릴 자동 지급이 없습니다.' }
  revalidatePath('/admin/promo-reviews')
  return { ok: true, message: '자동 지급분을 회수했습니다.' }
}


/**
 * 회수했던 이용권을 사람이 되살린다.
 *
 * 왜 사람이 하는가: 기간 안에 글을 내리면 자동으로는 다시 살아나지 않는다(그래야 '내렸다
 * 올리기'가 통하지 않는다). 그러면 실수로 잠깐 내린 사람은 길이 막히므로, 확인한 뒤
 * 여기서 풀어 준다. 되살린 뒤에는 표시를 남겨 둔다 — 위반이 있었다는 사실까지 지우면
 * 다음에 같은 일이 생겨도 아무도 모른다.
 *
 * 남은 기간이 이미 지난 것은 되살리지 않는다 — 되살려도 쓸 수 없는 이용권이다.
 */
export async function restoreBlogReview(feedbackId: string, userId: string | null): Promise<{ ok: boolean; message: string }> {
  await assertAdmin()
  const admin = createAdminClient()
  const orderIds = [`review-${feedbackId}`, ...(userId ? [`review-auto-${userId}`] : [])]
  const { data, error } = await admin
    .from('subscriptions')
    .update({ status: 'active', payment_key: GRANT_KEY_RESTORED })
    .in('order_id', orderIds)
    .eq('status', 'cancelled')
    .in('payment_key', [GRANT_KEY_VIOLATED, GRANT_KEY_REVOKED])
    .gt('expires_at', new Date().toISOString())
    .select('id')
  if (error) return { ok: false, message: `되살리기 실패: ${error.message}` }
  if (!data?.length) return { ok: false, message: '되살릴 것이 없습니다(남은 기간이 이미 지났거나 회수된 적이 없습니다).' }
  revalidatePath('/admin/promo-reviews')
  return { ok: true, message: `이용권을 되살렸습니다. 이 계정의 이벤트 차단도 풀렸습니다.` }
}
// 서버 액션은 레이아웃을 거치지 않고도 호출되므로 관리자 권한을 확인한다.
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user || !adminEmails.includes(user.email ?? '')) throw new Error('Forbidden')
}
