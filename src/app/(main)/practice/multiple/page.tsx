import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ListChecks, ChevronRight } from 'lucide-react'
import PracticeMultiple, { type PracticeQuestion } from './PracticeMultiple'

export default async function MultiplePracticePage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>
}) {
  const { set } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 세트 선택 전 — 객관식이 있는 회차 목록 + 전체 옵션
  if (!set) {
    const { data: rows } = await supabase
      .from('questions')
      .select('year, round')
      .eq('type', 'multiple')
      .order('year', { ascending: false })
      .order('round', { ascending: false })
    const sets = rows
      ? [...new Map(rows.map(r => [`${r.year}-${r.round}`, r])).values()]
      : []
    const total = rows?.length ?? 0

    return (
      <div className="animate-fade-up max-w-2xl">
        <Link href="/practice" className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
          <ArrowLeft className="h-4 w-4" /> 연습 메뉴
        </Link>
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">객관식 연습</h1>
        <p className="text-[#64748b] text-sm mb-6">풀 회차를 고르세요. 문제를 풀면 바로 정답과 해설을 보여줘요.</p>

        <div className="space-y-3">
          {total > 0 && (
            <Link href="/practice/multiple?set=all" className="card-hover group flex items-center justify-between bg-gradient-to-r from-[#1e3a5f] to-[#2d5488] text-white rounded-2xl p-5 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><ListChecks className="h-5 w-5" /></div>
                <div>
                  <p className="font-bold">전체 객관식 모아 풀기</p>
                  <p className="text-white/70 text-xs mt-0.5">모든 회차의 객관식 {total}문항</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
          {sets.map(({ year, round }) => (
            <Link key={`${year}-${round}`} href={`/practice/multiple?set=${year}-${round}`} className="card-hover group flex items-center justify-between bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,31,61,0.06)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/8 flex items-center justify-center"><ListChecks className="h-5 w-5 text-[#1e3a5f]" /></div>
                <p className="font-bold text-[#0f172a]">{year}년 {round}회 객관식</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#94a3b8] group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
          {sets.length === 0 && (
            <p className="text-sm text-[#94a3b8] bg-white border border-[#e2e8f0] rounded-2xl p-6 text-center">아직 등록된 객관식 문제가 없어요.</p>
          )}
        </div>
      </div>
    )
  }

  // 문제 로드 (연습이므로 정답·해설 포함)
  let query = supabase
    .from('questions')
    .select('id, year, round, number, question, options, passage, correct_answer, explanation')
    .eq('type', 'multiple')
    .order('year', { ascending: false })
    .order('round', { ascending: false })
    .order('number')

  let title = '전체 객관식'
  if (set !== 'all') {
    const [y, r] = set.split('-').map(Number)
    if (Number.isNaN(y) || Number.isNaN(r)) redirect('/practice/multiple')
    query = query.eq('year', y).eq('round', r)
    title = `${y}년 ${r}회 객관식`
  }

  const { data: questions } = await query
  if (!questions?.length) redirect('/practice/multiple')

  return <PracticeMultiple questions={questions as unknown as PracticeQuestion[]} title={title} />
}
