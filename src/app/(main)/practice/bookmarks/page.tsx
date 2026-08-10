import { createClient } from '@/lib/supabase/server'
import { redirectToLogin } from '@/lib/loginRedirect'
import Link from 'next/link'
import { ArrowLeft, Bookmark, ChevronRight } from 'lucide-react'
import PracticeMultiple, { type PracticeQuestion } from '../multiple/PracticeMultiple'
import { getActiveProgram } from '@/lib/programContext'
import { questionBank } from '@/lib/questionBank'

export const dynamic = 'force-dynamic'

// 즐겨찾기한 객관식을 모아 다시 푼다.
export default async function BookmarksPracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirectToLogin('/practice/bookmarks')

  const { data: marks } = await supabase
    .from('bookmarks')
    .select('question_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const ids = (marks ?? []).map(m => m.question_id as string)

  const { data: rows } = ids.length
    ? await questionBank()
        .from('questions')
        .select('id, year, round, number, question, options, passage, correct_answer, explanation')
        .in('id', ids)
        // 현재 보고 있는 시험의 문항만 — 두 시험 즐겨찾기가 섞이지 않게.
        .eq('program', await getActiveProgram())
        .eq('type', 'multiple')
        .order('round')
        .order('number')
    : { data: [] as PracticeQuestion[] }

  const questions = (rows ?? []) as unknown as PracticeQuestion[]

  if (questions.length === 0) {
    return (
      <div className="animate-fade-up max-w-2xl mx-auto">
        <Link href="/practice" className="inline-flex items-center gap-1.5 py-3 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
          <ArrowLeft className="h-4 w-4" /> 연습 메뉴
        </Link>
        {/* '결과 화면에서 하세요'라고만 하고 거기로 가는 길을 안 주면, 뒤로가기 말고는 갈 데가 없다 */}
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center bg-white rounded-2xl border border-[#e2e8f0]">
          <div className="bg-amber-50 p-5 rounded-2xl mb-4"><Bookmark className="h-10 w-10 text-amber-600" /></div>
          <p className="text-[#334155] text-sm font-semibold">즐겨찾기한 문제가 없어요</p>
          <p className="text-[#64748b] text-xs mt-1 leading-relaxed">
            모의고사를 풀고 결과 화면에서 <b className="text-[#334155]">별</b>을 누르면
            어려운 문항이 여기 모여요.
          </p>
          <Link
            href="/cbt"
            className="mt-6 inline-flex items-center justify-center gap-1.5 btn-primary text-white font-semibold px-6 py-3.5 rounded-xl text-sm"
          >
            모의고사 풀러 가기
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return <PracticeMultiple questions={questions} title={`즐겨찾기 문제 (${questions.length}문항)`} />
}
