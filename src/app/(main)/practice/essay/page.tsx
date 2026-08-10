import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, ChevronRight, Lock } from 'lucide-react'
import { getActiveSubscription } from '@/lib/subscription'
import { FREE_AI_TRIAL, readTrialUsed } from '@/lib/aiTrial'
import { isRoundLocked } from '@/lib/examAccess'
import { getActiveProgram } from '@/lib/programContext'
import PracticeEssay, { type PracticeEssayQuestion } from './PracticeEssay'
import { questionBank } from '@/lib/questionBank'

export default async function EssayPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>
}) {
  const { set } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const program = await getActiveProgram()

  if (!set) {
    const [{ data: rows }, subscription] = await Promise.all([
      questionBank()
        .from('questions')
        .select('year, round')
        .eq('program', program)
        .eq('type', 'essay')
        .lt('year', 9000)
        .order('year', { ascending: true })
        .order('round', { ascending: true }),
      getActiveSubscription(user.id),
    ])
    const hasSub = !!subscription
    const sets = rows
      ? [...new Map(rows.map(r => [`${r.year}-${r.round}`, r])).values()]
      : []

    return (
      <div className="animate-fade-up max-w-2xl mx-auto">
        <Link href="/practice" className="inline-flex items-center gap-1.5 py-3 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
          <ArrowLeft className="h-4 w-4" /> 연습 메뉴
        </Link>
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">서술형 연습</h1>
        <p className="text-[#64748b] text-sm mb-6">회차를 고르면 원고지에 답을 쓰고 문항별로 AI 채점을 받을 수 있어요. (모의고사 1·2회 무료)</p>

        <div className="space-y-3">
          {sets.map(({ year, round }) => {
            const locked = isRoundLocked(round, hasSub, program)
            return (
            <Link key={`${year}-${round}`} href={locked ? '/subscribe' : `/practice/essay?set=${year}-${round}`} className="card-hover group flex items-center justify-between bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,31,61,0.06)]">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${locked ? 'bg-[#f1f5f9]' : 'bg-amber-100'}`}>
                  {locked ? <Lock className="h-5 w-5 text-[#64748b]" /> : <FileText className="h-5 w-5 text-amber-700" />}
                </div>
                <p className="font-bold text-[#0f172a]">모의고사 {round}회 서술형 {locked && <span className="text-xs font-semibold text-amber-700 ml-1">이용권</span>}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#64748b] group-hover:translate-x-1 transition-transform" />
            </Link>
            )
          })}
          {sets.length === 0 && (
            <p className="text-sm text-[#64748b] bg-white border border-[#e2e8f0] rounded-2xl p-6 text-center">아직 등록된 서술형 문제가 없어요.</p>
          )}
        </div>
      </div>
    )
  }

  const [y, r] = set.split('-').map(Number)
  if (Number.isNaN(y) || Number.isNaN(r)) redirect('/practice/essay')

  const subscription = await getActiveSubscription(user.id)
  // 3회분부터는 이용권 필요
  if (y < 9000 && isRoundLocked(r, !!subscription, program)) redirect('/subscribe')

  // 문항과 체험 잔여는 서로 무관하다 — 함께 던진다.
  const [{ data: questions }, trialUsed] = await Promise.all([
    questionBank()
      .from('questions')
      .select('id, number, points, question, passage, correct_answer')
      .eq('program', program)
      .eq('type', 'essay')
      .eq('year', y)
      .eq('round', r)
      .order('number'),
    readTrialUsed(user.id, Number(user.app_metadata?.ai_trial_used ?? 0)),
  ])
  if (!questions?.length) redirect('/practice/essay')
  const trialRemaining = subscription ? 0 : Math.max(0, FREE_AI_TRIAL - trialUsed)

  return (
    // saveKey(서버 '저장하고 나가기')는 여기서 일부러 넘기지 않는다.
    // savePracticeProgress는 quiz_sessions를 (user, year, round)로 찾는데, 이 화면의
    // year·round는 실제 모의고사 회차와 같다 → 그 사람이 풀던 진짜 시험 세션을 찾아
    // saved_answers를 연습 답안으로 덮어쓴다. 유형별 연습이 센티넬 연도(9001)를 쓰는 이유다.
    // 작성 중 답안 유실은 PracticeEssay의 브라우저 임시 보관으로 막는다.
    <PracticeEssay
      questions={questions as unknown as PracticeEssayQuestion[]}
      title={`모의고사 ${r}회 서술형`}
      hasSubscription={!!subscription}
      aiTrialRemaining={trialRemaining}
    />
  )
}
