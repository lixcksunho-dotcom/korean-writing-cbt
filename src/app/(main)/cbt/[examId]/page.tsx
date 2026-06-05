import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExamPlayer, { type Question } from '@/components/cbt/ExamPlayer'
import { getOrCreateExamSession } from '@/app/(main)/cbt/actions'
import { getActiveSubscription } from '@/lib/subscription'

export default async function ExamPage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  const { examId } = await params
  const [yearStr, roundStr] = examId.split('-')
  const year = parseInt(yearStr)
  const round = parseInt(roundStr)

  if (isNaN(year) || isNaN(round)) redirect('/cbt')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, number, type, points, question, options, passage')
    .eq('year', year)
    .eq('round', round)
    .order('number')

  if (!questions?.length) redirect('/cbt')

  // 진행중 세션 이어풀기(있으면) + 구독 여부(저장하고 나가기 유료 게이팅)
  const [session, subscription] = await Promise.all([
    getOrCreateExamSession(year, round),
    getActiveSubscription(user.id),
  ])

  return (
    <ExamPlayer
      questions={questions as unknown as Question[]}
      examYear={year}
      examRound={round}
      sessionId={session.sessionId}
      initialAnswers={session.savedAnswers}
      initialTimeLeft={session.timeLeft}
      hasSubscription={!!subscription}
    />
  )
}
