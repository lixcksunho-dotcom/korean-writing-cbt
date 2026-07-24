'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getActiveSubscription } from '@/lib/subscription'
import { consumeAiTrial, FREE_AI_TRIAL } from '@/lib/aiTrial'
import { enforcePaidUsage, recordPaidGrade } from '@/lib/antiSharing'
import { trackServerEvent } from '@/lib/analytics/trackServerEvent'

export type Correction = {
  original: string
  correction: string
  reason: string
}

export type GradeResult = {
  totalScore: number
  breakdown: {
    manuscriptRules: { score: number; max: 30; feedback: string }
    examFit: { score: number; max: 40; feedback: string }
    spellingGrammar: { score: number; max: 30; feedback: string }
  }
  overallComment: string
  corrections: Correction[]
}

const SYSTEM_PROMPT = `당신은 한국실용글쓰기 검정 서술형(원고지) 채점위원입니다. 제출된 원고지 글을 아래 기준으로만 채점하고, 틀린 부분을 구체적으로 짚어 주세요.

【중요】 표현의 화려함·어휘의 다양성·문학적 창의성은 평가하지 않습니다. 오직 다음 세 가지만 봅니다: ①원고지 규정 준수 ②한국실용글쓰기 서술형 모범답안 기준 부합 ③맞춤법·어법 정확성.

【채점 기준】
1. 원고지 사용법 (30점)
   - 제목 위치, 문단 첫 칸 들여쓰기, 문장부호의 칸 사용(마침표·쉼표는 앞 글자와 같은 칸), 숫자(두 자리까지 한 칸)·영문(한 칸 한 글자) 칸쓰기, 띄어쓰기 한 칸 처리 등 원고지 작성 규정 준수 여부.

2. 한국실용글쓰기 답안 기준 부합 (40점)
   - 문제(주제)가 요구하는 조건 준수: 시작 어구, 문장 수, 분량(글자 수), 종결 형식, 문단 구성 등.
   - 한국실용글쓰기 서술형·보고서 모범답안처럼 객관적이고 간결한 문어체(공문서체)로, 주제에 충실하게 작성됐는지.
   - 서론-본론-결론 등 요구되는 글의 형식·짜임을 갖췄는지.
   - 창의적·개성적 표현이 아니라, 규범적·정형적 답안 형식과의 부합을 평가한다.

3. 맞춤법·어법 (30점)
   - 한글 맞춤법, 띄어쓰기, 문법·조사·어미 오류. 틀린 부분은 corrections에 빠짐없이 적는다.

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 금지):
{
  "totalScore": 숫자(0~100),
  "breakdown": {
    "manuscriptRules": { "score": 숫자(0~30), "max": 30, "feedback": "원고지 규정 준수에 대한 구체 피드백" },
    "examFit": { "score": 숫자(0~40), "max": 40, "feedback": "조건 준수·모범답안 형식 부합에 대한 구체 피드백" },
    "spellingGrammar": { "score": 숫자(0~30), "max": 30, "feedback": "맞춤법·어법에 대한 구체 피드백" }
  },
  "overallComment": "총평 (점수 근거와 핵심 보완점, 2~4문장)",
  "corrections": [
    { "original": "틀린 표현", "correction": "올바른 표현", "reason": "수정 이유(맞춤법·어법·원고지·조건 위반 등)" }
  ]
}`

export async function gradeManuscript(text: string, topic: string): Promise<GradeResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 유료 기능이지만 비구독자에게도 무료 체험 횟수를 허용한다(서술형 AI 채점과 같은 잔여 횟수 공유).
  // 서버에서도 한도를 강제해야 액션 직접 호출로 무료 AI(유료 API)를 쓰는 것을 막을 수 있다.
  const subscription = await getActiveSubscription(user.id)
  const trialUsed = Number(user.app_metadata?.ai_trial_used ?? 0)
  const usingTrial = !subscription
  if (usingTrial && trialUsed >= FREE_AI_TRIAL) throw new Error('SUBSCRIPTION_REQUIRED')

  // 계정 공유 방지: 기기 수·일일 한도 검사 (구독자만 해당)
  if (subscription) await enforcePaidUsage(user.id)

  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    // 채점 기준(SYSTEM_PROMPT)은 매 요청 동일하므로 프롬프트 캐싱 적용.
    // 5분 TTL 내 반복 호출 시 시스템 프롬프트 입력 토큰 비용이 크게 절감됨.
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{
      role: 'user',
      content: `주제: ${topic}\n\n작성한 글 (원고지 형식, 줄바꿈은 \\n으로 표시):\n${text}`,
    }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')

  let result: GradeResult
  try {
    const cleaned = block.text.replace(/```json\n?|\n?```/g, '').trim()
    result = JSON.parse(cleaned)
  } catch {
    throw new Error('AI 응답을 파싱할 수 없습니다.')
  }

  await supabase.from('manuscript_submissions').insert({
    user_id: user.id,
    topic,
    content: text,
    score: result.totalScore,
    feedback: result,
  })

  // 채점에 성공한 경우에만 체험 1회 차감(구독자는 차감 없이 일일 사용량만 기록)
  if (usingTrial) {
    await consumeAiTrial(user.id, trialUsed)
    await trackServerEvent('ai_trial_used', user.id, `manuscript_${trialUsed + 1}/${FREE_AI_TRIAL}`)
  } else {
    await recordPaidGrade(user.id)
  }
  return result
}
