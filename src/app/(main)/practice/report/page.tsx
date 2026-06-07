import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveSubscription } from '@/lib/subscription'
import { getAiTrialStatus } from '@/lib/aiTrial'
import ReportRunner, { type ReportQuestion } from './ReportRunner'

// 서술형 9번(원고지 보고서) 실전 — 실제 시험의 보고서 문항만 모아 시간 안에 이어서 푼다.
export default async function ReportPracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rows }, subscription] = await Promise.all([
    supabase
      .from('questions')
      .select('id, year, round, points, question, passage, correct_answer')
      .eq('type', 'essay')
      .gte('points', 200) // 원고지 보고서(9번)만
      .lt('year', 9000)   // 유형별 연습 전용(9001)은 제외
      .order('year', { ascending: true })
      .order('round', { ascending: true }),
    getActiveSubscription(user.id),
  ])

  const questions: ReportQuestion[] = (rows ?? []).map(r => ({
    id: r.id as string,
    points: r.points as number,
    question: r.question as string,
    passage: (r.passage as string | null) ?? null,
    correct_answer: r.correct_answer as string,
    examLabel: `${r.year}년 ${r.round}회`,
  }))

  if (!questions.length) redirect('/practice')

  const trial = await getAiTrialStatus()

  return <ReportRunner questions={questions} hasSubscription={!!subscription} aiTrialRemaining={trial.remaining} />
}
