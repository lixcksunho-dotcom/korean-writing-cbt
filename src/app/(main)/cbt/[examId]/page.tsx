import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExamPlayer, { type Question } from '@/components/cbt/ExamPlayer'
import { getOrCreateExamSession } from '@/app/(main)/cbt/actions'
import { getActiveSubscription } from '@/lib/subscription'
import { isRoundLocked } from '@/lib/examAccess'

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

  // 3회분부터는 구독 필요 — 비구독자가 잠긴 회차를 직접 열면 결제로 보낸다.
  const subscription = await getActiveSubscription(user.id)
  if (year < 9000 && isRoundLocked(round, !!subscription)) redirect('/subscribe')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, number, type, points, question, options, passage')
    .eq('year', year)
    .eq('round', round)
    .order('number')

  if (!questions?.length) redirect('/cbt')

  // 진행중 세션 이어풀기
  const session = await getOrCreateExamSession(year, round)

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
