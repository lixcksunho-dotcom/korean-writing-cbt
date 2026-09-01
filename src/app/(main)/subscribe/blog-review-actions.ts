'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordOperatorAlert } from '@/lib/operatorAlerts'
import {
  BLOG_REVIEW_PATH,
  checkBlogHtml,
  isLikelyBlogPostUrl,
  type RuleCheck,
} from '@/lib/blogPromoRules'

export type SubmitResult =
  | { ok: true; autoPassed: boolean; checks: RuleCheck[]; note: string }
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

  // 자동 확인. 못 읽어도 접수는 한다 — 네이버·티스토리는 본문을 스크립트로 그린다.
  let checks: RuleCheck[] = []
  let autoPassed = false
  let note = ''
  try {
    const res = await fetch(link, {
      headers: {
        // 블로그가 봇에게 빈 문서를 주는 일이 잦아 일반 브라우저처럼 요청한다.
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    })
    if (!res.ok) {
      note = `주소를 열지 못했어요(${res.status}). 사람이 직접 확인합니다.`
    } else {
      const html = await res.text()
      const r = checkBlogHtml(html)
      checks = r.checks
      autoPassed = r.allPassed
      note = r.readable
        ? (autoPassed ? '조건을 모두 만족했어요. 확인 뒤 이용권을 드립니다.' : '아래 항목을 고쳐서 다시 신청해 주세요.')
        : '글을 자동으로 읽지 못했어요(네이버·티스토리는 흔한 일이에요). 사람이 직접 확인합니다.'
    }
  } catch {
    note = '주소를 여는 데 시간이 오래 걸렸어요. 접수했고 사람이 직접 확인합니다.'
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

  return { ok: true, autoPassed, checks, note }
}
