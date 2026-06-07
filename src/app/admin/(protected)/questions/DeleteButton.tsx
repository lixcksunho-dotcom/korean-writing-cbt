'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteQuestion } from './actions'

export default function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('이 문제를 삭제할까요?')) return
    startTransition(async () => {
      await deleteQuestion(id)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
