'use client'

import { useState, useTransition } from 'react'
import { Bookmark } from 'lucide-react'
import { toggleBookmark } from '@/lib/study-actions'

export default function BookmarkButton({ questionId, initial }: { questionId: string; initial: boolean }) {
  const [on, setOn] = useState(initial)
  const [pending, start] = useTransition()

  function toggle() {
    const next = !on
    setOn(next) // 낙관적
    start(async () => {
      try { await toggleBookmark(questionId) }
      catch { setOn(!next) }
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={on ? '즐겨찾기 해제' : '즐겨찾기'}
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
        on ? 'text-amber-600 bg-amber-50' : 'text-[#64748b] hover:bg-[#f1f5f9]'
      }`}
    >
      <Bookmark className={`h-3.5 w-3.5 ${on ? 'fill-amber-500 text-amber-500' : ''}`} />
      {on ? '저장됨' : '즐겨찾기'}
    </button>
  )
}
