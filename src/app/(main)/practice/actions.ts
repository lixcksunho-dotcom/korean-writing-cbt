'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getActiveSubscription } from '@/lib/subscription'
import { consumeAiTrial, FREE_AI_TRIAL, readTrialUsed } from '@/lib/aiTrial'
import { enforcePaidUsage, recordPaidGrade } from '@/lib/antiSharing'
import { assertWithinGradingLimit, MAX_ANSWER_CHARS } from '@/lib/aiGradingLimits'
import type { EssayGrade } from '@/app/(main)/cbt/actions'
import { questionBank } from '@/lib/questionBank'

// 서술형 '연습' 채점: 정식 시험 세션과 무관하게 단일 문항을 즉시 채점한다.
// (시험 세션 기반 채점은 cbt/actions.ts 의 gradeExamEssay 사용)
const PRACTICE_ESSAY_PROMPT = `당신은 국가공인 한국실용글쓰기검정 서술형 채점위원입니다.
제시된 [문제/조건], [모범답안], [수험자 답안]을 보고 채점하세요.

먼저 문제 유형을 구분하세요.
(A) 한 문장의 맞춤법·외래어·띄어쓰기·문장 호응 등을 '고쳐 쓰는' 단답형 교정 문제
(B) 여러 문장·문단으로 쓰는 본격 서술형(작문) 문제

(A) 단답형 교정 문제일 때:
- 오직 '고쳐야 할 부분을 바르게 고쳤는가'만 본다. 모범답안과 표기·형식이 조금 달라도(예: "오랜만에" 또는 "오랫만에 → 오랜만에") 핵심 교정이 맞으면 만점을 준다.
- 문단 수·문장 수·종결 형식 같은 서술형 기준은 적용하지 않는다.
- feedback은 무엇을 왜 그렇게 고치는지 1~2문장으로 간결히 설명한다.

(B) 본격 서술형 문제일 때:
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

  // 이 액션은 브라우저에서 직접 호출 가능하고 userAnswer가 그대로 유료 API로 들어간다 → 길이 상한 필수.
  assertWithinGradingLimit(userAnswer, MAX_ANSWER_CHARS, '답안')

  // 서술형 AI 채점은 유료 기능. 단, 비구독자는 평생 1회 무료 체험 허용.
  const subscription = await getActiveSubscription(user.id)
  const trialUsed = await readTrialUsed(user.id, Number(user.app_metadata?.ai_trial_used ?? 0))
  const usingTrial = !subscription
  if (usingTrial && trialUsed >= FREE_AI_TRIAL) throw new Error('SUBSCRIPTION_REQUIRED')

  // 유료(구독) 사용 시 계정 공유 방지: 기기 수·일일 한도 검사
  if (subscription) await enforcePaidUsage(user.id)

  // 사용량 차감은 API 호출 '전'에 한다. 성공 후에 차감하면 응답 파싱이 실패하는 입력을
  // 골라 무한 재시도할 수 있고, 그때마다 요금은 실제로 발생한다.
  if (usingTrial) {
    if (!(await consumeAiTrial(user.id, trialUsed))) throw new Error('SUBSCRIPTION_REQUIRED')
  } else {
    await recordPaidGrade(user.id)
  }

  const { data: question } = await questionBank()
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

// ===== 유형별/연습 '저장하고 나가기' (유료 전용) =====
// 시험과 동일하게 quiz_sessions 를 재사용한다. (연습은 year=9001 센티넬)

// 진행중(미완료) 연습 세션의 저장된 답안을 돌려준다. 없으면 빈 객체.
export async function getPracticeProgress(
  year: number,
  round: number
): Promise<{ savedAnswers: Record<string, string>; resumed: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { savedAnswers: {}, resumed: false }

  const { data: existing } = await supabase
    .from('quiz_sessions')
    .select('saved_answers, saved_at')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('round', round)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    savedAnswers: (existing?.saved_answers as Record<string, string> | null) ?? {},
    resumed: !!existing?.saved_at,
  }
}

// 연습 답안을 중간 저장한다(유료 전용). 진행중 세션이 없으면 만든다.
export async function savePracticeProgress(
  year: number,
  round: number,
  answers: Record<string, string>
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 저장하고 나가기는 유료 전용
  const subscription = await getActiveSubscription(user.id)
  if (!subscription) throw new Error('SUBSCRIPTION_REQUIRED')

  const { data: existing } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('round', round)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sessionId = existing?.id as string | undefined
    ?? (await supabase
      .from('quiz_sessions')
      .insert({ user_id: user.id, year, round })
      .select('id')
      .single()).data?.id

  if (!sessionId) throw new Error('세션을 만들 수 없습니다.')

  const { error } = await supabase
    .from('quiz_sessions')
    .update({ saved_answers: answers, saved_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (error) throw error
}
