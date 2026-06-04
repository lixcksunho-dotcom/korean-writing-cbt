'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getActiveSubscription } from '@/lib/subscription'
import type { EssayGrade } from '@/app/(main)/cbt/actions'

// 서술형 '연습' 채점: 정식 시험 세션과 무관하게 단일 문항을 즉시 채점한다.
// (시험 세션 기반 채점은 cbt/actions.ts 의 gradeExamEssay 사용)
const PRACTICE_ESSAY_PROMPT = `당신은 국가공인 한국실용글쓰기검정 서술형 채점위원입니다.
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

export async function gradeEssayPractice(
  questionId: string,
  userAnswer: string
): Promise<EssayGrade> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 서술형 AI 채점은 유료 기능 — 서버에서 구독 강제
  const subscription = await getActiveSubscription(user.id)
  if (!subscription) throw new Error('SUBSCRIPTION_REQUIRED')

  const { data: question } = await supabase
    .from('questions')
    .select('points, question, correct_answer')
    .eq('id', questionId)
    .single()
  if (!question) throw new Error('Question not found')

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: [
      { type: 'text', text: PRACTICE_ESSAY_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{
      role: 'user',
      content: `[배점] ${question.points}점\n\n[문제/조건]\n${question.question}\n\n[모범답안]\n${question.correct_answer}\n\n[수험자 답안]\n${userAnswer || '(미작성)'}`,
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
  result.maxScore = question.points
  result.score = Math.max(0, Math.min(question.points, Math.round(result.score)))
  return result
}
