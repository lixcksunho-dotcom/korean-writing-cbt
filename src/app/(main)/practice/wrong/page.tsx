import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import PracticeMultiple, { type PracticeQuestion } from '../multiple/PracticeMultiple'
import { getActiveProgram } from '@/lib/programContext'
import { questionBank } from '@/lib/questionBank'

export const dynamic = 'force-dynamic'

// 오답 재시험 — 내가 '지금도 틀리는' 객관식만 모아 다시 푼다.
export default async function WrongPracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 현재 보고 있는 시험의 오답만 — 두 시험 문항이 한 묶음에 섞이지 않게.
  const program = await getActiveProgram()

  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id, completed_at')
    .eq('user_id', user.id)
    .eq('program', program)
    .not('completed_at', 'is', null)

  const sessionDate = new Map((sessions ?? []).map(s => [s.id as string, new Date(s.completed_at as string).getTime()]))

  let wrongIds: string[] = []
  if ((sessions ?? []).length > 0) {
    const { data: ans } = await supabase
      .from('quiz_answers')
      .select('session_id, question_id, is_correct')
      .in('session_id', (sessions ?? []).map(s => s.id))
      .not('is_correct', 'is', null)
    const sorted = (ans ?? []).slice().sort((a, b) =>
      (sessionDate.get(a.session_id as string) ?? 0) - (sessionDate.get(b.session_id as string) ?? 0))
    const latest = new Map<string, boolean>()
    for (const a of sorted) latest.set(a.question_id as string, !!a.is_correct)
    wrongIds = [...latest.entries()].filter(([, ok]) => !ok).map(([id]) => id)
  }

  const { data: rows } = wrongIds.length
    ? await questionBank()
        .from('questions')
        .select('id, year, round, number, question, options, passage, correct_answer, explanation')
        .in('id', wrongIds)
        .eq('program', program)
        .eq('type', 'multiple')
        .order('round')
        .order('number')
    : { data: [] as PracticeQuestion[] }

  const questions = (rows ?? []) as unknown as PracticeQuestion[]

  if (questions.length === 0) {
    return (
      <div className="animate-fade-up max-w-2xl mx-auto">
        <Link href="/insights" className="inline-flex items-center gap-1.5 py-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
          <ArrowLeft className="h-4 w-4" /> 학습 리포트
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-[#e2e8f0]">
          <div className="bg-emerald-50 p-5 rounded-2xl mb-4"><CheckCircle2 className="h-10 w-10 text-emerald-500" /></div>
          <p className="text-[#334155] text-sm font-semibold">지금 틀리는 객관식이 없어요!</p>
          <p className="text-[#64748b] text-xs mt-1">모의고사를 더 풀면 약점이 자동으로 모입니다.</p>
        </div>
      </div>
    )
  }

  return <PracticeMultiple questions={questions} title={`오답 다시 풀기 (${questions.length}문항)`} />
}
