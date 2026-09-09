import { createClient } from '@/lib/supabase/server'
import { redirectToLogin } from '@/lib/loginRedirect'
import { redirect } from 'next/navigation'
import ExamPlayer, { type Question } from '@/components/cbt/ExamPlayer'
import ExamIntro from '@/components/cbt/ExamIntro'
import { getOrCreateExamSession, findResumableExamSession } from '@/app/(main)/cbt/actions'
import { getActiveSubscription } from '@/lib/subscription'
import { isRoundLocked } from '@/lib/examAccess'
import { parseExamId } from '@/lib/examId'
import { getProgram } from '@/lib/programs'
import { questionBank } from '@/lib/questionBank'

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>
  searchParams: Promise<{ start?: string }>
}) {
  const { examId } = await params
  const { start } = await searchParams
  const parsed = parseExamId(examId)
  if (!parsed) redirect('/cbt')
  const { program, year, round } = parsed

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirectToLogin(`/cbt/${examId}`)

  // 3회분부터는 구독 필요 — 비구독자가 잠긴 회차를 직접 열면 결제로 보낸다.
  const subscription = await getActiveSubscription(user.id)
  if (year < 9000 && isRoundLocked(round, !!subscription, program)) redirect('/subscribe')

  const { data: questions } = await questionBank()
    .from('questions')
    .select('id, number, type, points, question, options, passage, audio_url')
    .eq('program', program)
    .eq('year', year)
    .eq('round', round)
    .order('number')

  if (!questions?.length) redirect('/cbt')

  // 시작을 누르기 전에는 아무것도 만들지 않는다.
  //
  // 예전에는 이 화면을 여는 순간 세션이 생겼다 — 어떤 시험인지 보려고 눌러 본 사람도
  // '시작했다 미완료'로 남았고, 실측 118건 중 112건이 그런 빈 기록이었다(check:dropoff).
  // 이어풀 것이 있는 사람은 안내를 건너뛴다 — 그 사람은 이미 시작한 사람이다.
  const resumable = await findResumableExamSession(year, round, program)
  if (start !== '1' && !resumable) {
    const cfg = getProgram(program)
    return (
      <ExamIntro
        cfg={cfg}
        round={round}
        objectiveCount={questions.filter(q => q.type !== 'essay').length}
        essayCount={questions.filter(q => q.type === 'essay').length}
        startHref={`/cbt/${examId}?start=1`}
      />
    )
  }

  // 진행중 세션 이어풀기 (없으면 여기서 만든다)
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
