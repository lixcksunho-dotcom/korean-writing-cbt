import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Target } from 'lucide-react'
import { getActiveSubscription } from '@/lib/subscription'
import { getActiveProgram } from '@/lib/programContext'
import { getProgram } from '@/lib/programs'
import { KBS_TYPES, classifyKbsType } from '@/lib/kbsQuestionType'
import PracticeMultiple, { type PracticeQuestion } from '../multiple/PracticeMultiple'
import { questionBank } from '@/lib/questionBank'

// 렌더 안에서 정의하면 렌더마다 새 컴포넌트 타입이 되어 React가 하위를 통째로 다시 마운트한다.
function TypeGroup({
  title,
  items,
  counts,
}: {
  title: string
  items: typeof KBS_TYPES
  counts: Map<string, number>
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold text-[#64748b] mb-2.5">{title}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map(type => (
          <Link
            key={type.key}
            href={`/practice/kbs-types?t=${type.key}`}
            className="card-hover group flex items-center justify-between bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-[0_4px_16px_rgba(15,31,61,0.06)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-[#0f172a] text-sm">{type.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs bg-[#f1f5f9] text-[#475569] px-2.5 py-1 rounded-full font-semibold">{counts.get(type.key)}문</span>
              <ChevronRight className="h-5 w-5 text-[#64748b] group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// KBS 어휘·어법 기출유형별 집중 연습. 유형은 발문으로 분류(kbsQuestionType).
// 영역별(어휘 15문항 통째)보다 잘게(고유어·한자성어·속담…) 파고들어 약점을 정밀 공략한다.
export default async function KbsTypesPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>
}) {
  const { t } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const program = await getActiveProgram()
  const cfg = getProgram(program)
  // 어휘·어법 세분 연습은 KBS 전용 — 실용글쓰기는 기존 '유형별 집중 연습'을 쓴다.
  if (program !== 'kbs') redirect('/practice/types')

  const subscription = await getActiveSubscription(user.id)
  const hasSub = !!subscription
  const roundLimit = hasSub ? 9999 : cfg.freeRounds

  // 어휘(16~30)·어법(31~45) 문항만 불러와 발문으로 유형 분류
  const { data: rows } = await questionBank()
    .from('questions')
    .select('id, year, round, number, question, options, passage, correct_answer, explanation, audio_url')
    .eq('program', program)
    .eq('type', 'multiple')
    .lt('year', 9000)
    .lte('round', roundLimit)
    .gte('number', 16)
    .lte('number', 45)
    .order('round', { ascending: true })
    .order('number')

  const classified = (rows ?? []).map(q => ({ q, type: classifyKbsType(q.question as string) }))

  // 유형 선택 후 — 해당 유형 문항 풀기
  if (t) {
    const type = KBS_TYPES.find(x => x.key === t)
    if (!type) redirect('/practice/kbs-types')
    const picked = classified.filter(c => c.type?.key === t).map(c => c.q)
    if (!picked.length) redirect('/practice/kbs-types')
    return (
      <PracticeMultiple
        questions={picked as unknown as PracticeQuestion[]}
        title={`유형별 · ${type.label}`}
        backHref="/practice/kbs-types"
      />
    )
  }

  const counts = new Map<string, number>()
  for (const c of classified) if (c.type) counts.set(c.type.key, (counts.get(c.type.key) ?? 0) + 1)
  const available = KBS_TYPES.filter(x => (counts.get(x.key) ?? 0) > 0)
  const vocab = available.filter(x => x.area === '어휘')
  const grammar = available.filter(x => x.area === '어법')

  return (
    <div className="animate-fade-up max-w-2xl mx-auto">
      <Link href="/practice" className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
        <ArrowLeft className="h-4 w-4" /> 연습 메뉴
      </Link>
      <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">유형별 집중 연습</h1>
      <p className="text-[#64748b] text-sm mb-6">
        어휘·어법을 기출유형별로 골라 한 문제씩 풀어요. {hasSub ? '모든 회차' : `무료 ${cfg.freeRounds}회차`}의 문항이 유형별로 묶입니다.
      </p>

      {vocab.length > 0 && <TypeGroup title="어휘" items={vocab} counts={counts} />}
      {grammar.length > 0 && <TypeGroup title="어법" items={grammar} counts={counts} />}

      {!hasSub && (
        <Link
          href="/subscribe"
          className="mt-1 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-[#fffbeb] to-[#fff7ed] px-5 py-4 hover:border-amber-300 transition-colors"
        >
          <span className="text-sm text-[#334155]">
            이용권을 열면 <b>모든 회차</b>의 유형별 문항이 함께 들어와 유형마다 더 많이 풀 수 있어요.
          </span>
          <span className="shrink-0 text-sm font-black text-[#1e3a5f] whitespace-nowrap">5,500원 →</span>
        </Link>
      )}
    </div>
  )
}
