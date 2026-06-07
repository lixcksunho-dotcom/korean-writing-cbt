'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getActiveSubscription } from '@/lib/subscription'
import { enforcePaidUsage, recordPaidGrade } from '@/lib/antiSharing'

export type Correction = {
  original: string
  correction: string
  reason: string
}

export type GradeResult = {
  totalScore: number
  breakdown: {
    manuscriptRules: { score: number; max: 10; feedback: string }
    spellingGrammar: { score: number; max: 30; feedback: string }
    contentStructure: { score: number; max: 30; feedback: string }
    expressionVocabulary: { score: number; max: 30; feedback: string }
  }
  overallComment: string
  corrections: Correction[]
}

const SYSTEM_PROMPT = `당신은 한국실용글쓰기 시험 채점 전문가입니다. 제출된 원고지 글을 다음 기준으로 채점하세요.

【채점 기준】
1. 원고지 사용법 (10점)
   - 제목: 첫 줄 오른쪽에서 2~4칸 비우고 시작 (줄의 중간~오른쪽)
   - 본문 단락: 첫 칸 반드시 비우고 시작 (들여쓰기)
   - 문장부호: 마침표·쉼표는 앞 글자와 같은 칸, 줄 끝에 부호가 오면 다음 칸 시작 가능
   - 숫자: 두 자리까지 한 칸에, 영문 대소문자 한 칸에 한 글자

2. 맞춤법·어법 (30점)
   - 한글 맞춤법, 띄어쓰기, 외래어 표기
   - 문법적 오류, 조사·어미 사용

3. 내용 구성 (30점)
   - 주제 적합성 (제시된 주제에 맞게 작성)
   - 서론·본론·결론 구성
   - 논리적 전개, 단락 구성의 일관성

4. 표현·어휘 (30점)
   - 어휘 선택의 정확성과 다양성
   - 문체의 일관성 (문어체 유지)
   - 중복 표현 없이 명확한 문장

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 금지):
{
  "totalScore": 숫자(0~100),
  "breakdown": {
    "manuscriptRules": { "score": 숫자(0~10), "max": 10, "feedback": "구체적 피드백" },
    "spellingGrammar": { "score": 숫자(0~30), "max": 30, "feedback": "구체적 피드백" },
    "contentStructure": { "score": 숫자(0~30), "max": 30, "feedback": "구체적 피드백" },
    "expressionVocabulary": { "score": 숫자(0~30), "max": 30, "feedback": "구체적 피드백" }
  },
  "overallComment": "종합 평가 (3~5문장)",
  "corrections": [
    { "original": "틀린 표현", "correction": "올바른 표현", "reason": "수정 이유" }
  ]
}`

export async function gradeManuscript(text: string, topic: string): Promise<GradeResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 유료 기능 보호: UI 페이월뿐 아니라 서버에서도 구독을 강제해야
  // 액션을 직접 호출해 무료로 AI(유료 API)를 쓰는 것을 막을 수 있음
  const subscription = await getActiveSubscription(user.id)
  if (!subscription) throw new Error('구독이 필요한 기능입니다.')

  // 계정 공유 방지: 기기 수·일일 한도 검사
  await enforcePaidUsage(user.id)

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

  await recordPaidGrade(user.id) // 일일 사용량 기록
  return result
}
