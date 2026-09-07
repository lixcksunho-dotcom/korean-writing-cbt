'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// 권한 확인은 신고 화면과 같은 방식(레이아웃 가드만 믿지 않는다 — 서버 액션은 직접 불릴 수 있다).
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user || !adminEmails.includes(user.email ?? '')) throw new Error('Forbidden')
}

/** 운영자 답글이 남는 자리(page_views.path). 회원 화면의 해결 띠가 이걸 읽어 보여 준다. */
export const FEEDBACK_REPLY_PATH = '#event/feedback_reply'

/**
 * 처리함/되돌리기. 답글을 같이 주면 그 사람의 해결 띠에 그 글이 실린다.
 *
 * 왜 답글인가: 해결 띠는 "해결됐습니다"만 말했고 본문은 8/28 한 건에 맞춘 글이 굳어 있었다.
 * "회원 탈퇴 어디서 하나요" 같은 문의에 "결과 다시 보기를 누르세요"가 뜨는 셈이다.
 * 표를 새로 만들지 않고 page_views 에 (path=답글, visitor_id=문의 id, referrer=답글 본문)으로 둔다.
 */
export async function setFeedbackResolved(id: string, resolved: boolean, reply?: string) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('feedback').update({ resolved }).eq('id', id)
  if (error) throw new Error(error.message)

  const text = (reply ?? '').trim().slice(0, 500)
  // 답글은 한 문의에 하나 — 새로 쓰면 이전 것을 지운다(되돌리기 때도 지운다).
  await admin.from('page_views').delete().eq('path', FEEDBACK_REPLY_PATH).eq('visitor_id', id)
  if (resolved && text) {
    const { error: replyError } = await admin.from('page_views').insert({ path: FEEDBACK_REPLY_PATH, visitor_id: id, referrer: text })
    if (replyError) throw new Error(replyError.message)
  }
  revalidatePath('/admin/feedback')
}
