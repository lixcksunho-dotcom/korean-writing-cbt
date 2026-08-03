import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Layers } from 'lucide-react'
import { getActiveSubscription } from '@/lib/subscription'
import { getActiveProgram } from '@/lib/programContext'
import { getProgram } from '@/lib/programs'
import PracticeMultiple, { type PracticeQuestion } from '../multiple/PracticeMultiple'
import { questionBank } from '@/lib/questionBank'

// 영역별 집중 연습 — 결과 화면의 '약점 영역'을 곧바로 이어서 풀 수 있게 하는 연습.
// 영역은 시험별 문항 번호 구간(programs.ts areas)으로 정의되므로 두 시험 모두에서 동작한다.
export default async function AreaPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string }>
}) {
  const { a } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const program = await getActiveProgram()
  const cfg = getProgram(program)
  const subscription = await getActiveSubscription(user.id)
  const hasSub = !!subscription

  // 비구독자는 무료 회차 범위에서만 연습 — 잠긴 회차 문항이 새어 나가지 않게 한다.
  const roundLimit = hasSub ? 9999 : cfg.freeRounds

  if (a == null) {
    const { data: rows } = await questionBank()
      .from('questions')
      .select('number')
      .eq('program', program)
      .eq('type', 'multiple')
      .lt('year', 9000)
      .lte('round', roundLimit)
    const counts = cfg.areas.map(
      area => (rows ?? []).filter(r => r.number >= area.from && r.number <= area.to).length,
    )

    return (
      <div className="animate-fade-up max-w-2xl mx-auto">
        <Link href="/practice" className="inline-flex items-center gap-1.5 py-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
          <ArrowLeft className="h-4 w-4" /> 연습 메뉴
        </Link>
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">영역별 집중 연습</h1>
        <p className="text-[#64748b] text-sm mb-6">
          점수가 가장 덜 나온 영역만 모아서 풀어요. {hasSub ? '모든 회차' : `무료 ${cfg.freeRounds}회차`}의 객관식이 영역별로 묶입니다.
        </p>

        <div className="space-y-3">
          {cfg.areas.map((area, i) => (
            <Link
              key={area.name}
              href={`/practice/areas?a=${i}`}
              className="card-hover group flex items-center justify-between bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,31,61,0.06)]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-[#1e3a5f] flex items-center justify-center shadow-md">
                  <Layers className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-[#0f172a]">{area.name}</p>
                  <p className="text-xs text-[#64748b] mt-0.5">{area.from}~{area.to}번 영역</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs bg-[#f1f5f9] text-[#475569] px-2.5 py-1 rounded-full font-semibold">{counts[i]}문항</span>
                <ChevronRight className="h-5 w-5 text-[#64748b] group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {!hasSub && (
          <Link
            href="/subscribe"
            className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-[#fffbeb] to-[#fff7ed] px-5 py-4 hover:border-amber-300 transition-colors"
          >
            <span className="text-sm text-[#334155]">
              이용권을 열면 <b>모든 회차</b>의 문항이 영역별 연습에 함께 들어와요.
            </span>
            <span className="shrink-0 text-sm font-black text-[#1e3a5f] whitespace-nowrap">5,500원 →</span>
          </Link>
        )}
      </div>
    )
  }

  const idx = Number(a)
  const area = cfg.areas[idx]
  if (!area) redirect('/practice/areas')

  const { data: questions } = await questionBank()
    .from('questions')
    .select('id, year, round, number, question, options, passage, correct_answer, explanation, audio_url')
    .eq('program', program)
    .eq('type', 'multiple')
    .lt('year', 9000)
    .lte('round', roundLimit)
    .gte('number', area.from)
    .lte('number', area.to)
    .order('round', { ascending: true })
    .order('number')

  if (!questions?.length) redirect('/practice/areas')

  return (
    <PracticeMultiple
      questions={questions as unknown as PracticeQuestion[]}
      title={`영역별 · ${area.name}`}
      backHref="/practice/areas"
    />
  )
}
