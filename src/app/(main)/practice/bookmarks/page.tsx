import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bookmark } from 'lucide-react'
import PracticeMultiple, { type PracticeQuestion } from '../multiple/PracticeMultiple'

export const dynamic = 'force-dynamic'

// 즐겨찾기한 객관식을 모아 다시 푼다.
export default async function BookmarksPracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: marks } = await supabase
    .from('bookmarks')
    .select('question_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const ids = (marks ?? []).map(m => m.question_id as string)

  const { data: rows } = ids.length
    ? await supabase
        .from('questions')
        .select('id, year, round, number, question, options, passage, correct_answer, explanation')
        .in('id', ids)
        .eq('type', 'multiple')
        .order('round')
        .order('number')
    : { data: [] as PracticeQuestion[] }

  const questions = (rows ?? []) as unknown as PracticeQuestion[]

  if (questions.length === 0) {
    return (
      <div className="animate-fade-up max-w-2xl">
        <Link href="/practice" className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
          <ArrowLeft className="h-4 w-4" /> 연습 메뉴
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-[#e2e8f0]">
          <div className="bg-amber-50 p-5 rounded-2xl mb-4"><Bookmark className="h-10 w-10 text-amber-400" /></div>
          <p className="text-[#334155] text-sm font-semibold">즐겨찾기한 문제가 없어요.</p>
          <p className="text-[#94a3b8] text-xs mt-1">시험 결과 화면에서 어려운 문제를 즐겨찾기 해보세요.</p>
        </div>
      </div>
    )
  }

  return <PracticeMultiple questions={questions} title={`즐겨찾기 문제 (${questions.length}문항)`} />
}
