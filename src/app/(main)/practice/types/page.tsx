import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, SpellCheck, Globe, Link2, FileText } from 'lucide-react'
import { getActiveSubscription } from '@/lib/subscription'
import { getActiveProgram } from '@/lib/programContext'
import { getPracticeProgress } from '../actions'
import PracticeEssay, { type PracticeEssayQuestion } from '../essay/PracticeEssay'

// 유형별 집중 연습 — 연습 전용 센티넬(year=9001), round=유형.
const PRACTICE_YEAR = 9001

const CATEGORIES = [
  { round: 1, title: '맞춤법 고치기', desc: '자주 틀리는 맞춤법을 한 문장씩 찾아 고쳐요.', icon: SpellCheck, grad: 'from-rose-500 to-pink-600' },
  { round: 2, title: '외래어 표기', desc: '헷갈리는 외래어 표기를 바르게 고치며 익혀요.', icon: Globe, grad: 'from-sky-500 to-blue-600' },
  { round: 3, title: '문장 호응·고쳐쓰기', desc: '주술 호응·중복·시제 오류를 바로잡아요.', icon: Link2, grad: 'from-violet-500 to-purple-600' },
  { round: 4, title: '공문서 수정', desc: '공문서의 띄어쓰기·표기·종결을 다듬어요.', icon: FileText, grad: 'from-amber-500 to-[#d97706]' },
] as const

export default async function TypesPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>
}) {
  const { set } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const program = await getActiveProgram()

  // 유형 선택 전 — 카테고리 목록
  if (!set) {
    const { data: rows } = await supabase
      .from('questions')
      .select('round')
      .eq('program', program)
      .eq('year', PRACTICE_YEAR)
    const counts = new Map<number, number>()
    for (const r of rows ?? []) counts.set(r.round, (counts.get(r.round) ?? 0) + 1)

    return (
      <div className="animate-fade-up max-w-2xl mx-auto">
        <Link href="/practice" className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
          <ArrowLeft className="h-4 w-4" /> 연습 메뉴
        </Link>
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">유형별 집중 연습</h1>
        <p className="text-[#64748b] text-sm mb-6">자주 출제되는 유형을 골라 한 문장씩 고쳐 쓰며 감을 익혀요. 모범답안은 바로 확인할 수 있어요.</p>

        <div className="space-y-3">
          {CATEGORIES.map(({ round, title, desc, icon: Icon, grad }) => (
            <Link
              key={round}
              href={`/practice/types?set=${round}`}
              className="card-hover group flex items-center justify-between bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,31,61,0.06)]"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-[#0f172a]">{title}</p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">{desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs bg-[#f1f5f9] text-[#64748b] px-2.5 py-1 rounded-full font-semibold">{counts.get(round) ?? 0}문</span>
                <ChevronRight className="h-5 w-5 text-[#94a3b8] group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // 특정 유형 풀기
  const round = Number(set)
  const cat = CATEGORIES.find(c => c.round === round)
  if (!cat) redirect('/practice/types')

  const [{ data: questions }, subscription] = await Promise.all([
    supabase
      .from('questions')
      .select('id, number, points, question, passage, correct_answer')
      .eq('program', program)
      .eq('type', 'essay')
      .eq('year', PRACTICE_YEAR)
      .eq('round', round)
      .order('number'),
    getActiveSubscription(user.id),
  ])
  if (!questions?.length) redirect('/practice/types')

  // 저장해 둔 진행 상황(유료 전용 기능이지만, 불러오기는 누구나 — 비구독자는 빈 값)
  const { savedAnswers } = await getPracticeProgress(PRACTICE_YEAR, round)

  return (
    <PracticeEssay
      questions={questions as unknown as PracticeEssayQuestion[]}
      title={`유형별 · ${cat.title}`}
      hasSubscription={!!subscription}
      backHref="/practice/types"
      saveKey={{ year: PRACTICE_YEAR, round }}
      initialAnswers={savedAnswers}
    />
  )
}
