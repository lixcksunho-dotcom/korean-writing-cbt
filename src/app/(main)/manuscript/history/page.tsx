import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PenLine, ChevronLeft, Trophy, Clock } from 'lucide-react'
import type { GradeResult } from '@/app/(main)/manuscript/actions'

// 신·구 채점 항목 키 라벨(과거 기록 호환)
const BD_LABELS: Record<string, string> = {
  manuscriptRules: '원고지',
  examFit: '답안부합',
  spellingGrammar: '맞춤법',
  contentStructure: '내용구성',
  expressionVocabulary: '표현·어휘',
}

export default async function ManuscriptHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: submissions } = await supabase
    .from('manuscript_submissions')
    .select('id, topic, score, content, created_at, feedback')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/manuscript" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">원고지 채점 기록</h1>
          <p className="text-gray-500 text-xs mt-0.5">총 {submissions?.length ?? 0}건</p>
        </div>
      </div>

      {!submissions?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-amber-50 p-5 rounded-2xl mb-4">
            <PenLine className="h-10 w-10 text-[#f59e0b]" />
          </div>
          <p className="text-gray-500 text-sm mb-4">아직 제출한 원고지가 없습니다.</p>
          <Link href="/manuscript" className="text-sm bg-[#1e3a5f] text-white px-5 py-3.5 rounded-xl font-medium hover:bg-[#2d5488] transition-colors">
            원고지 작성하기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map(s => {
            const score = s.score ?? 0
            const pass = score >= 80
            const fb = s.feedback as GradeResult | null
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-800 leading-relaxed flex-1">{s.topic}</p>
                  <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
                    pass ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Trophy className="h-3.5 w-3.5" />
                    {score}점
                  </div>
                </div>

                {fb?.breakdown && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                    {Object.entries(fb.breakdown).map(([k, v]) => {
                      const item = v as { score: number; max: number }
                      const label = BD_LABELS[k] ?? k
                      return (
                        <div key={k} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                          <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                          <div className="text-sm font-bold text-gray-800">{item.score}<span className="text-xs font-normal text-gray-400">/{item.max}</span></div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(s.created_at).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <span className="text-xs text-gray-400">{Array.from(s.content as string).filter(c => c !== '\n').length}자</span>
                </div>

                {fb?.overallComment && (
                  <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {fb.overallComment}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
