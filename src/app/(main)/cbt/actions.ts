'use server'

import { createClient } from '@/lib/supabase/server'

export async function createSession(year: number, round: number): Promise<{ sessionId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({ user_id: user.id, year, round })
    .select('id')
    .single()

  if (error) throw error
  return { sessionId: data.id }
}

export async function submitSession(
  sessionId: string,
  answers: Record<string, string>
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('id, year, round')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) throw new Error('Session not found')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, type, correct_answer')
    .eq('year', session.year)
    .eq('round', session.round)

  if (!questions) throw new Error('Questions not found')

  // 자동 채점 대상: 객관식(multiple), 단답형(short) 만
  // 서술형(essay)은 is_correct = null 처리
  let score = 0
  const autoGradable = questions.filter(q => q.type !== 'essay')
  const answerRows = questions.map(q => {
    const userAnswer = answers[q.id] ?? ''
    if (q.type === 'essay') {
      return { session_id: sessionId, question_id: q.id, user_answer: userAnswer, is_correct: null }
    }
    const isCorrect = userAnswer.trim() === q.correct_answer.trim()
    if (isCorrect) score++
    return { session_id: sessionId, question_id: q.id, user_answer: userAnswer, is_correct: isCorrect }
  })

  await supabase.from('quiz_answers').insert(answerRows)
  await supabase
    .from('quiz_sessions')
    .update({ completed_at: new Date().toISOString(), score, total: autoGradable.length })
    .eq('id', sessionId)
}
