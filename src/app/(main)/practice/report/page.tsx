import { createClient } from '@/lib/supabase/server'
import { redirectToLogin } from '@/lib/loginRedirect'
import { redirect } from 'next/navigation'
import { getActiveSubscription } from '@/lib/subscription'
import { FREE_AI_TRIAL, readTrialUsed } from '@/lib/aiTrial'
import { getActiveProgram } from '@/lib/programContext'
import { getProgram } from '@/lib/programs'
import ReportRunner, { type ReportQuestion } from './ReportRunner'
import { questionBank } from '@/lib/questionBank'

// 서술형 9번(원고지 보고서) 실전 — 실제 시험의 보고서 문항만 모아 시간 안에 이어서 푼다.
export default async function ReportPracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirectToLogin('/practice/report')

  const program = await getActiveProgram()
  const cfg = getProgram(program)

  // trialUsed는 user.id만 있으면 되는 조회다. 뒤에 따로 await하면 왕복이 하나 더 는다.
  const [{ data: rows }, subscription, trialUsed] = await Promise.all([
    questionBank()
      .from('questions')
      .select('id, year, round, points, question, passage, correct_answer')
      .eq('program', program)
      .eq('type', 'essay')
      .gte('points', cfg.manuscriptMinPoints) // 원고지 보고서(고배점 서술형)만
      .lt('year', 9000)   // 유형별 연습 전용(9001)은 제외
      .order('year', { ascending: true })
      .order('round', { ascending: true }),
    getActiveSubscription(user.id),
    readTrialUsed(user.id, Number(user.app_metadata?.ai_trial_used ?? 0)),
  ])

  // 비구독자는 무료 회차 보고서만
  const visibleRows = subscription ? (rows ?? []) : (rows ?? []).filter(r => (r.round as number) <= cfg.freeRounds)

  const questions: ReportQuestion[] = visibleRows.map(r => ({
    id: r.id as string,
    points: r.points as number,
    question: r.question as string,
    passage: (r.passage as string | null) ?? null,
    correct_answer: r.correct_answer as string,
    examLabel: `모의고사 ${r.round}회`,
  }))

  if (!questions.length) redirect('/practice')

  const trialRemaining = subscription ? 0 : Math.max(0, FREE_AI_TRIAL - trialUsed)

  return <ReportRunner questions={questions} hasSubscription={!!subscription} aiTrialRemaining={trialRemaining} />
}
