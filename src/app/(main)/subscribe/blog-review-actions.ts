'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordOperatorAlert } from '@/lib/operatorAlerts'
import {
  BLOG_REVIEW_PATH,
  REWARD_DAYS,
  checkBlogHtml,
  isLikelyBlogPostUrl,
  type RuleCheck,
} from '@/lib/blogPromoRules'
import { fetchBlogPost, countPhotos, countBodyChars } from '@/lib/blogPromoFetch'
import { getActiveSubscription } from '@/lib/subscription'
import { blogRewardQuota } from '@/lib/blogRewardQuota'

export type SubmitResult =
  | { ok: true; autoPassed: boolean; granted: boolean; checks: RuleCheck[]; note: string }
  | { ok: false; message: string }

/** 신청 주소를 받아 자동 확인을 돌리고 접수한다. 승인은 사람이 한다. */
export async function submitBlogReview(url: string): Promise<SubmitResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인한 뒤에 신청해 주세요.' }

  const link = (url ?? '').trim()
  if (!isLikelyBlogPostUrl(link)) {
    return { ok: false, message: '글 주소를 정확히 넣어 주세요(블로그 첫 화면이 아니라 글 주소여야 해요).' }
  }

  const admin = createAdminClient()

  // 같은 사람이 같은 글을 또 내는 것을 막는다. 다른 글이면 다시 낼 수 있다.
  const { data: dup } = await admin
    .from('feedback')
    .select('id')
    .eq('user_id', user.id)
    .eq('path', BLOG_REVIEW_PATH)
    .eq('contact', link)
    .limit(1)
  if (dup?.length) return { ok: false, message: '이미 신청한 글이에요. 심사 결과를 기다려 주세요.' }

  // 자동 확인. 네이버는 원본 주소가 껍데기라 본문이 들어 있는 주소로 바꿔 읽는다.
  let checks: RuleCheck[] = []
  let autoPassed = false
  let note = ''
  const fetched = await fetchBlogPost(link)
  if (fetched.html === null) {
    note = `${fetched.reason}. 접수했고 사람이 직접 확인합니다.`
  } else {
    const r = checkBlogHtml(fetched.html, countPhotos(fetched.html), countBodyChars(fetched.html))
    checks = r.checks
    autoPassed = r.allPassed
    note = autoPassed
      ? '조건을 모두 만족했어요.'
      : '아래에서 ✗ 표시된 것을 고치고 다시 신청해 주세요.'
  }

  // 다 통과하면 사람을 기다리지 않고 그 자리에서 지급한다.
  // 제목·본문·사진·글자수·광고표시가 모두 맞은 상태다.
  let granted = false
  if (autoPassed) {
    // 자리가 남아 있어야 준다. 마감이어도 접수는 받는다 — 조건을 다 갖춰 쓴 글을
    // '자리가 없다'는 이유로 없던 일로 만들면 그 사람은 헛수고를 한 것이 된다.
    const quota = await blogRewardQuota()
    if (quota.closed) {
      note = `조건을 모두 만족했지만 선착순 ${quota.total}명이 마감됐어요. 접수는 해 두었으니 자리가 나면 알려 드릴게요.`
      autoPassed = false
    }
  }

  if (autoPassed) {
    const current = await getActiveSubscription(user.id)
    const base = current ? new Date(current.expires_at) : new Date()
    const expiresAt = new Date(base.getTime() + REWARD_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { error: grantErr } = await admin.from('subscriptions').insert({
      user_id: user.id,
      payment_key: 'promo:blog-review',
      // 사람마다 한 번만 자동 지급된다 — 여러 글을 써도 자동 지급은 1회.
      order_id: `review-auto-${user.id}`,
      amount: 0,
      status: 'active',
      expires_at: expiresAt,
    })
    if (!grantErr) {
      granted = true
      note = `조건을 모두 만족해 이용권 ${REWARD_DAYS}일을 바로 드렸어요.`
    } else if (grantErr.code === '23505') {
      note = '조건은 만족했지만 이미 이 행사로 이용권을 받으셨어요.'
    } else {
      note = '조건은 만족했어요. 지급에 문제가 있어 사람이 확인 후 처리합니다.'
    }
  }

  const summary = checks.length
    ? checks.map(c => `${c.ok ? 'OK' : 'NG'} ${c.rule} (${c.detail})`).join('\n')
    : '자동 확인 불가'

  const { error } = await admin.from('feedback').insert({
    user_id: user.id,
    path: BLOG_REVIEW_PATH,
    contact: link,
    message: `[블로그 홍보 신청]\n${link}\n\n${summary}`,
    resolved: false,
  })
  if (error) return { ok: false, message: '접수 중 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.' }

  await recordOperatorAlert(
    'feedback',
    `블로그 홍보 신청 — ${autoPassed ? '자동 확인 통과' : '사람 확인 필요'}\n${link}`,
    user.id,
  ).catch(() => {})

  return { ok: true, autoPassed, granted, checks, note }
}
