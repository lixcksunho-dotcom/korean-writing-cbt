import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, ChevronRight } from 'lucide-react'
import { getActiveSubscription } from '@/lib/subscription'
import PracticeEssay, { type PracticeEssayQuestion } from './PracticeEssay'

export default async function EssayPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>
}) {
  const { set } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!set) {
    const { data: rows } = await supabase
      .from('questions')
      .select('year, round')
      .eq('type', 'essay')
      .lt('year', 9000)
      .order('year', { ascending: false })
      .order('round', { ascending: false })
    const sets = rows
      ? [...new Map(rows.map(r => [`${r.year}-${r.round}`, r])).values()]
      : []

    return (
      <div className="animate-fade-up max-w-2xl">
        <Link href="/practice" className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
          <ArrowLeft className="h-4 w-4" /> 연습 메뉴
        </Link>
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">서술형 연습</h1>
        <p className="text-[#64748b] text-sm mb-6">회차를 고르면 원고지에 답을 쓰고 문항별로 AI 채점을 받을 수 있어요.</p>

        <div className="space-y-3">
          {sets.map(({ year, round }) => (
            <Link key={`${year}-${round}`} href={`/practice/essay?set=${year}-${round}`} className="card-hover group flex items-center justify-between bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,31,61,0.06)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><FileText className="h-5 w-5 text-amber-600" /></div>
                <p className="font-bold text-[#0f172a]">{year}년 {round}회 서술형</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#94a3b8] group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
          {sets.length === 0 && (
            <p className="text-sm text-[#94a3b8] bg-white border border-[#e2e8f0] rounded-2xl p-6 text-center">아직 등록된 서술형 문제가 없어요.</p>
          )}
        </div>
      </div>
    )
  }

  const [y, r] = set.split('-').map(Number)
  if (Number.isNaN(y) || Number.isNaN(r)) redirect('/practice/essay')

  const [{ data: questions }, subscription] = await Promise.all([
    supabase
      .from('questions')
      .select('id, number, points, question, passage, correct_answer')
      .eq('type', 'essay')
      .eq('year', y)
      .eq('round', r)
      .order('number'),
    getActiveSubscription(user.id),
  ])
  if (!questions?.length) redirect('/practice/essay')

  return (
    <PracticeEssay
      questions={questions as unknown as PracticeEssayQuestion[]}
      title={`${y}년 ${r}회 서술형`}
      hasSubscription={!!subscription}
    />
  )
}
