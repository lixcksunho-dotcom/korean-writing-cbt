'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getActiveSubscription } from '@/lib/subscription'

export type EssayGrade = {
  score: number
  maxScore: number
  feedback: string
  strengths: string[]
  improvements: string[]
}

const ESSAY_SYSTEM_PROMPT = `당신은 국가공인 한국실용글쓰기검정 서술형 채점위원입니다.
제시된 [문제/조건], [모범답안], [수험자 답안]을 보고 채점하세요.

채점 원칙:
- 문제에서 요구한 조건(시작 어구, 문장 수, 어절 수, 종결 형식, 문단 수 등) 준수 여부를 최우선으로 본다.
- 내용의 적합성, 논리성, 표현의 정확성(맞춤법·어법·문어체)을 함께 평가한다.
- 모범답안과 표현이 달라도 조건을 충족하고 내용이 타당하면 정답으로 인정한다.
- 논제와 무관한 장황한 서술, 조건 미준수는 감점한다.

반드시 아래 JSON 형식으로만 응답하세요(다른 텍스트 금지):
{
  "score": 정수(0 ~ 배점),
  "maxScore": 배점,
  "feedback": "총평 (2~4문장)",
  "strengths": ["잘한 점", ...],
  "improvements": ["보완할 점", ...]
}`

export async function gradeExamEssay(
  sessionId: string,
  questionId: string
): Promise<EssayGrade> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 서술형 AI 채점은 유료 기능 — 서버에서 구독 강제
  const subscription = await getActiveSubscription(user.id)
  if (!subscription) throw new Error('SUBSCRIPTION_REQUIRED')

  // 본인 세션의 답안인지 확인
  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()
  if (!session) throw new Error('Session not found')

  const { data: question } = await supabase
    .from('questions')
    .select('id, points, question, correct_answer')
    .eq('id', questionId)
    .single()
  if (!question) throw new Error('Question not found')

  const { data: answerRow } = await supabase
    .from('quiz_answers')
    .select('id, user_answer, ai_feedback')
    .eq('session_id', sessionId)
    .eq('question_id', questionId)
    .single()
  if (!answerRow) throw new Error('Answer not found')

  // 이미 채점된 경우 재사용 (중복 과금 방지)
  if (answerRow.ai_feedback) return answerRow.ai_feedback as EssayGrade

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: [
      { type: 'text', text: ESSAY_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{
      role: 'user',
      content: `[배점] ${question.points}점\n\n[문제/조건]\n${question.question}\n\n[모범답안]\n${question.correct_answer}\n\n[수험자 답안]\n${answerRow.user_answer || '(미작성)'}`,
    }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')

  let result: EssayGrade
  try {
    const cleaned = block.text.replace(/```json\n?|\n?```/g, '').trim()
    result = JSON.parse(cleaned)
  } catch {
    throw new Error('AI 응답을 파싱할 수 없습니다.')
  }
  // 배점 범위 보정
  result.maxScore = question.points
  result.score = Math.max(0, Math.min(question.points, Math.round(result.score)))

  await supabase
    .from('quiz_answers')
    .update({ ai_score: result.score, ai_feedback: result })
    .eq('id', answerRow.id)

  return result
}

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
