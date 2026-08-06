import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Edit2, BookOpen } from 'lucide-react'
import DeleteButton from './DeleteButton'

export default async function AdminQuestionsPage() {
  const supabase = await createClient()

  const { data: questions } = await supabase
    .from('questions')
    .select('id, year, round, number, type, question')
    .order('year', { ascending: false })
    .order('round', { ascending: true })
    .order('number', { ascending: true })

  // year-round 기준으로 그룹핑
  const groups = new Map<string, typeof questions>()
  for (const q of questions ?? []) {
    const key = `${q.year}-${q.round}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(q)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">문제 관리</h1>
          <p className="text-gray-600 text-sm mt-1">총 {questions?.length ?? 0}문항</p>
        </div>
        <Link
          href="/admin/questions/new"
          className="flex items-center gap-1.5 bg-[#1e3a5f] hover:bg-[#2d5488] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          문제 추가
        </Link>
      </div>

      {groups.size === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">등록된 문제가 없습니다.</p>
          <Link href="/admin/questions/new" className="inline-block mt-2 py-2.5 text-sm text-[#1e3a5f] font-medium hover:underline">
            첫 번째 문제 추가하기 →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([key, qs]) => {
            const [year, round] = key.split('-')
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="font-bold text-gray-800">{year}년 {round}회</h2>
                  <span className="text-xs text-gray-600">{qs!.length}문항</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {qs!.map(q => (
                    <div key={q.id} className="flex items-center gap-3 px-5 py-3.5">
                      <span className="text-xs font-bold text-gray-600 w-6 shrink-0">{q.number}번</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        q.type === 'multiple' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {q.type === 'multiple' ? '객관식' : '단답형'}
                      </span>
                      <p className="flex-1 text-sm text-gray-700 truncate">{q.question}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link
                          href={`/admin/questions/${q.id}/edit`}
                          className="p-1.5 text-gray-600 hover:text-[#1e3a5f] hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <DeleteButton id={q.id} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
