import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuestionForm from '@/components/admin/QuestionForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: q } = await supabase
    .from('questions')
    .select('id, year, round, number, type, passage, question, options, correct_answer, explanation')
    .eq('id', id)
    .single()

  if (!q) redirect('/admin/questions')

  return (
    <div className="max-w-2xl">
      <Link href="/admin/questions" className="inline-flex items-center gap-1 py-2.5 text-sm text-gray-600 hover:text-gray-700 mb-3 transition-colors">
        <ChevronLeft className="h-4 w-4" />
        문제 목록으로
      </Link>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-6">문제 수정</h1>
        <QuestionForm
          initial={{
            id: q.id,
            year: q.year,
            round: q.round,
            number: q.number,
            type: q.type as 'multiple' | 'short' | 'essay',
            passage: q.passage ?? '',
            question: q.question,
            options: q.options as string[] | null,
            correct_answer: q.correct_answer,
            explanation: q.explanation ?? '',
          }}
        />
      </div>
    </div>
  )
}
