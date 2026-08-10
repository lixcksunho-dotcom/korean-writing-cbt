'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getActiveSubscription } from '@/lib/subscription'
import { consumeAiTrial, refundAiTrial, FREE_AI_TRIAL, readTrialUsed } from '@/lib/aiTrial'
import { paidUsageBlock, recordPaidGrade } from '@/lib/antiSharing'
import { gradingLimitError, MAX_ANSWER_CHARS } from '@/lib/aiGradingLimits'
import { describeGradingFailure, truncatedFailure, alertGradingFailure } from '@/lib/aiGradingFailure'
import { createAdminClient } from '@/lib/supabase/admin'
import { SUBSCRIPTION_REQUIRED, type GradingError } from '@/lib/aiGradingMessage'
import { trackServerEvent } from '@/lib/analytics/trackServerEvent'
import { formatExamId } from '@/lib/examId'
import { type ProgramId } from '@/lib/programs'
import { questionBank } from '@/lib/questionBank'

export type EssayGrade = {
  score: number
  maxScore: number
  feedback: string
  strengths: string[]
  improvements: string[]
}

// 한국어 채점 JSON은 대략 1.5자당 1토큰(count_tokens 실측). 서술형 응답은 총평·장점·
// 보완점뿐이라 원고지보다 짧지만, 잘리면 파싱이 반드시 실패하므로 여유를 둔다.
const ESSAY_MAX_TOKENS = 2500

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
): Promise<EssayGrade | GradingError> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 서술형 AI 채점은 유료 기능. 단, 비구독자는 평생 1회 무료 체험 허용.
  const subscription = await getActiveSubscription(user.id)
  const trialUsed = await readTrialUsed(user.id, Number(user.app_metadata?.ai_trial_used ?? 0))
  const usingTrial = !subscription
  if (usingTrial && trialUsed >= FREE_AI_TRIAL) return { error: SUBSCRIPTION_REQUIRED }

  // 유료(구독) 사용 시 계정 공유 방지: 기기 수·일일 한도 검사
  if (subscription) {
    const blocked = await paidUsageBlock(user.id)
    if (blocked) return { error: blocked }
  }

  // 본인 세션의 답안인지 확인
  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()
  if (!session) throw new Error('Session not found')

  const { data: question } = await questionBank()
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

  // 답안은 사용자가 넣은 값이라 그대로 유료 API로 보내면 길이가 곧 비용이 된다.
  const tooLong = gradingLimitError(answerRow.user_answer ?? '', MAX_ANSWER_CHARS, '답안')
  if (tooLong) return { error: tooLong }

  // 사용량 차감은 API 호출 '전'에. 성공 후에 차감하면 파싱이 실패하는 입력으로
  // 무한 재시도가 가능하고, 실패해도 요금은 이미 발생한 뒤다.
  if (usingTrial) {
    if (!(await consumeAiTrial(user.id, trialUsed))) return { error: SUBSCRIPTION_REQUIRED }
    await trackServerEvent('ai_trial_used', user.id, `used_${trialUsed + 1}/${FREE_AI_TRIAL}`)
  } else {
    await recordPaidGrade(user.id) // 구독자 일일 사용량 기록
  }

  // new Anthropic()도 try 안에 둔다. 키가 비어 있으면 생성자가 던지는데,
  // 밖에 두면 차감만 되고 환불이 안 된 채 사용자가 체험 1회를 잃는다.
  let response
  try {
    const client = new Anthropic()
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: ESSAY_MAX_TOKENS,
      system: [
        { type: 'text', text: ESSAY_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{
        role: 'user',
        content: `[배점] ${question.points}점\n\n[문제/조건]\n${question.question}\n\n[모범답안]\n${question.correct_answer}\n\n[수험자 답안]\n${answerRow.user_answer || '(미작성)'}`,
      }],
    })
  } catch (err) {
    // 응답 자체를 못 받았다(설정·잔액·통신·5xx·타임아웃). 우리 쪽 사정이니 차감을 되돌린다.
    // 파싱 실패는 되돌리지 않는다 — 그건 입력을 골라 공짜로 무한 호출하는 통로가 된다.
    const f = describeGradingFailure(err)
    console.error(f.operator, { userId: user.id })
    await alertGradingFailure('서술형(시험)', f)
    if (usingTrial && f.refund) await refundAiTrial(user.id, trialUsed + 1)
    return { error: f.userMessage }
  }

  // 길이 제한에 걸려 잘렸으면 JSON이 중간에서 끊겨 파싱이 반드시 실패한다.
  if (response.stop_reason === 'max_tokens') {
    const f = truncatedFailure(ESSAY_MAX_TOKENS)
    console.error(f.operator, { userId: user.id })
    await alertGradingFailure('서술형(시험)', f)
    if (usingTrial) await refundAiTrial(user.id, trialUsed + 1)
    return { error: f.userMessage }
  }

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')

  let result: EssayGrade
  try {
    const cleaned = block.text.replace(/```json\n?|\n?```/g, '').trim()
    result = JSON.parse(cleaned)
  } catch {
    return { error: 'AI 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.' }
  }
  // 배점 범위 보정
  result.maxScore = question.points
  result.score = Math.max(0, Math.min(question.points, Math.round(result.score)))

  // 채점 결과 저장은 service_role로 한다. quiz_answers엔 사용자 UPDATE 정책이 없어
  // (그리고 없어야 한다 — 있으면 본인 ai_score를 고쳐 쓸 수 있다) 사용자 클라이언트로는
  // 이 쓰기가 조용히 실패하고, 그러면 캐시가 안 남아 볼 때마다 재채점·재과금된다.
  const { error: cacheError } = await createAdminClient()
    .from('quiz_answers')
    .update({ ai_score: result.score, ai_feedback: result })
    .eq('id', answerRow.id)
  if (cacheError) console.error('[gradeExamEssay] 채점 결과 저장 실패:', cacheError.message)

  return result
}

export async function createSession(
  year: number,
  round: number,
  program: ProgramId = 'silyong',
): Promise<{ sessionId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({ user_id: user.id, year, round, program })
    .select('id')
    .single()

  if (error) throw error
  return { sessionId: data.id }
}

// 진행중(미완료) 세션을 찾아 이어풀기 상태를 돌려주고, 없으면 새로 만든다.
// (시험 페이지가 서버에서 호출 → ExamPlayer에 sessionId·저장답안·남은시간 전달)
export async function getOrCreateExamSession(
  year: number,
  round: number,
  program: ProgramId = 'silyong',
): Promise<{
  sessionId: string
  savedAnswers: Record<string, string>
  timeLeft: number | null
  resumed: boolean
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing } = await supabase
    .from('quiz_sessions')
    .select('id, saved_answers, time_left, saved_at')
    .eq('user_id', user.id)
    .eq('program', program)
    .eq('year', year)
    .eq('round', round)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return {
      sessionId: existing.id as string,
      savedAnswers: (existing.saved_answers as Record<string, string> | null) ?? {},
      timeLeft: (existing.time_left as number | null) ?? null,
      resumed: !!existing.saved_at,
    }
  }

  const { data: created, error } = await supabase
    .from('quiz_sessions')
    .insert({ user_id: user.id, year, round, program })
    .select('id')
    .single()
  if (error) throw error
  return { sessionId: created.id as string, savedAnswers: {}, timeLeft: null, resumed: false }
}

// 시험 중간 저장 (유료 전용). 답안·남은시간을 세션에 보관하고 시험화면을 빠져나간다.
export async function saveExamProgress(
  sessionId: string,
  answers: Record<string, string>,
  timeLeftSec: number
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 저장하고 나가기는 유료 전용. 여기는 채점이 아니라 화면이 결과를 안 그리므로
  // 예전처럼 던진다(값 반환은 채점 액션에만 해당).
  const subscription = await getActiveSubscription(user.id)
  if (!subscription) throw new Error(SUBSCRIPTION_REQUIRED)

  const { error } = await supabase
    .from('quiz_sessions')
    .update({
      saved_answers: answers,
      time_left: Math.max(0, Math.round(timeLeftSec)),
      saved_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .is('completed_at', null)

  if (error) throw error
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
    .select('id, program, year, round, completed_at')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) throw new Error('Session not found')

  // 이미 제출된 세션이면 중복 채점하지 않는다(더블클릭·뒤로가기 재제출).
  // quiz_answers엔 (session_id, question_id) 유니크가 없어 재삽입 시 답안이 중복 적재되고,
  // 그러면 서술형 AI 채점의 .single() 조회가 깨지고 영역별·예상점수 집계가 이중 계산된다.
  if (session.completed_at) return

  const { data: questions } = await questionBank()
    .from('questions')
    .select('id, type, correct_answer')
    .eq('program', session.program)
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

  // 답안 저장이 실패했는데 세션만 완료로 찍으면, 사용자는 점수만 있고 답안이 없는 결과를
  // 보게 된다. 문항별 복기도 오답노트도 비고, 클라이언트가 들고 있던 답안은 이미 버려진 뒤다.
  // 그러니 여기서 멈춰야 한다 — 화면에 남아 있으면 다시 제출할 수 있다.
  // insert가 아니라 upsert인 이유: 답안은 들어갔는데 아래 세션 업데이트만 실패하면
  // 사용자가 다시 제출하게 되는데, 그때 (session_id, question_id) 유니크 제약에 걸려
  // 영영 못 끝낸다. 같은 키면 덮어쓰게 해 재시도가 되도록 한다.
  const { error: answersError } = await supabase
    .from('quiz_answers')
    .upsert(answerRows, { onConflict: 'session_id,question_id' })
  if (answersError) {
    console.error('[cbt] 답안 저장 실패 — 세션을 완료로 표시하지 않음', {
      sessionId, code: answersError.code, message: answersError.message,
    })
    throw new Error('답안을 저장하지 못했어요. 잠시 후 다시 제출해 주세요.')
  }

  const { error: sessionError } = await supabase
    .from('quiz_sessions')
    .update({ completed_at: new Date().toISOString(), score, total: autoGradable.length })
    .eq('id', sessionId)
  if (sessionError) {
    // 답안은 들어갔으니 데이터는 살아 있다. completed_at이 아직 비어 있어 재제출이
    // 가능하고, 답안은 upsert라 같은 값으로 덮어써진다.
    console.error('[cbt] 세션 완료 표시 실패', {
      sessionId, code: sessionError.code, message: sessionError.message,
    })
    throw new Error('채점 결과를 저장하지 못했어요. 잠시 후 다시 제출해 주세요.')
  }

  // 퍼널: 모의고사 완료(가입→첫시험→체험→구독 상단 퍼널 측정용)
  // 이벤트 키는 formatExamId로 — 실용글쓰기는 기존 "year-round" 유지, KBS는 "kbs-year-round".
  await trackServerEvent(
    'exam_completed',
    user.id,
    formatExamId(session.program as ProgramId, session.year, session.round),
  )
}
