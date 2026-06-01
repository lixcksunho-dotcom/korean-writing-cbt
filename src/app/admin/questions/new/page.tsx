import QuestionForm from '@/components/admin/QuestionForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function NewQuestionPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/admin/questions" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
        <ChevronLeft className="h-4 w-4" />
        문제 목록으로
      </Link>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-6">새 문제 추가</h1>
        <QuestionForm />
      </div>
    </div>
  )
}
