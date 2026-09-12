'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveProgram } from '@/lib/programContext'
import { questionBank } from '@/lib/questionBank'
import { gradeWrongNoteRetake, WRONG_NOTE_RETAKE_YEAR } from '@/lib/wrongNoteRetake'

export async function recordWrongNoteRetake(questionId: string, choice: string): Promise<{ error: string | null }> {
  const failure = { error: '기록이 저장되지 않았어요. 다시 시도해 주세요.' }
  try {
    if (typeof questionId !== 'string' || typeof choice !== 'string') return failure
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return failure
    const program = await getActiveProgram()
    const { data: question, error: questionError } = await questionBank().from('questions')
      .select('program, type, options, correct_answer').eq('id', questionId)
      .eq('program', program).eq('type', 'multiple').maybeSingle()
    const answer = gradeWrongNoteRetake(question, program, choice)
    if (questionError || !answer) return failure

    // 완료 시각을 공유하면 다른 문항의 과거 답까지 최신 시도로 바뀌므로 시도마다 분리한다.
    const { data: session, error: sessionError } = await supabase.from('quiz_sessions')
      .insert({ user_id: user.id, program, year: WRONG_NOTE_RETAKE_YEAR, round: 1 })
      .select('id').single()
    if (sessionError || !session) return failure
    const { error: answerError } = await supabase.from('quiz_answers')
      .insert({ session_id: session.id, question_id: questionId, ...answer })
    if (answerError) return failure
    // 답안 저장에 실패한 시도는 오답 목록의 완료 기록에 들어가면 안 된다.
    const { data: completed, error: completionError } = await supabase.from('quiz_sessions')
      .update({ completed_at: new Date().toISOString() }).eq('id', session.id).eq('user_id', user.id)
      .select('id').single()
    if (completionError || !completed) return failure
    return { error: null }
  } catch {
    return failure
  }
}
