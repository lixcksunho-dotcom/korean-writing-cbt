import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExamPlayer, { type Question } from '@/components/cbt/ExamPlayer'
import { getOrCreateExamSession } from '@/app/(main)/cbt/actions'
import { getActiveSubscription } from '@/lib/subscription'
import { isRoundLocked } from '@/lib/examAccess'
import { parseExamId } from '@/lib/examId'

export default async function ExamPage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  const { examId } = await params
  const parsed = parseExamId(examId)
  if (!parsed) redirect('/cbt')
  const { program, year, round } = parsed

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 3회분부터는 구독 필요 — 비구독자가 잠긴 회차를 직접 열면 결제로 보낸다.
  const subscription = await getActiveSubscription(user.id)
  if (year < 9000 && isRoundLocked(round, !!subscription, program)) redirect('/subscribe')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, number, type, points, question, options, passage, audio_url')
    .eq('program', program)
    .eq('year', year)
    .eq('round', round)
    .order('number')

  if (!questions?.length) redirect('/cbt')

  // 진행중 세션 이어풀기
  const session = await getOrCreateExamSession(year, round, program)

  return (
    <ExamPlayer
      questions={questions as unknown as Question[]}
      examYear={year}
      examRound={round}
      examProgram={program}
      sessionId={session.sessionId}
      initialAnswers={session.savedAnswers}
      initialTimeLeft={session.timeLeft}
      hasSubscription={!!subscription}
    />
  )
}
