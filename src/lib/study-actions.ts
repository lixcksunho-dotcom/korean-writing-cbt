'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendQuestionReportAlert } from '@/lib/questionReportAlert'

/** 즐겨찾기 토글 — 새 상태(true=등록됨)를 반환 */
export async function toggleBookmark(questionId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('question_id')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .maybeSingle()

  if (existing) {
    await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('question_id', questionId)
    revalidatePath('/practice/bookmarks')
    return false
  }
  await supabase.from('bookmarks').insert({ user_id: user.id, question_id: questionId })
  revalidatePath('/practice/bookmarks')
  return true
}

/** 문제 오류 신고 */
export async function submitQuestionReport(questionId: string, reason: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const trimmed = (reason ?? '').trim()
  if (!trimmed) throw new Error('신고 사유를 입력해 주세요.')
  const { error } = await supabase
    .from('question_reports')
    .insert({ user_id: user.id, question_id: questionId, reason: trimmed.slice(0, 500) })
  if (error) throw new Error(error.message)

  // 신고 저장 후 관리자에게 텔레그램 알림(설정된 경우). 알림 실패는 신고 접수에 영향 주지 않음.
  const { data: q } = await supabase
    .from('questions')
    .select('program, year, round, number')
    .eq('id', questionId)
    .single()
  if (q) {
    await sendQuestionReportAlert({
      reason: trimmed.slice(0, 500),
      program: q.program,
      year: q.year,
      round: q.round,
      number: q.number,
      reporter: user.email ?? user.id,
    })
  }
}
