'use client'

import { useState, useTransition } from 'react'
import { Bookmark } from 'lucide-react'
import { toggleBookmark } from '@/lib/study-actions'

export default function BookmarkButton({ questionId, initial }: { questionId: string; initial: boolean }) {
  const [on, setOn] = useState(initial)
  const [failed, setFailed] = useState(false)
  const [pending, start] = useTransition()

  function toggle() {
    const next = !on
    setOn(next) // 낙관적
    setFailed(false)
    start(async () => {
      try { await toggleBookmark(questionId) }
      catch {
        // 예전엔 말없이 별만 되돌렸다. 사용자는 자기가 잘못 눌렀다고 생각하고 계속 누른다.
        setOn(!next)
        setFailed(true)
      }
    })
  }

  return (
    <span className="inline-flex items-center gap-1.5">
    <button
      onClick={toggle}
      disabled={pending}
      title={on ? '즐겨찾기 해제' : '즐겨찾기'}
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
        on ? 'text-amber-700 bg-amber-50' : 'text-[#64748b] hover:bg-[#f1f5f9]'
      }`}
    >
      <Bookmark className={`h-3.5 w-3.5 ${on ? 'fill-amber-500 text-amber-500' : ''}`} />
      {on ? '저장됨' : '즐겨찾기'}
    </button>
    {failed && (
      <span role="status" className="text-xs text-red-600">저장 안 됨 · 다시 눌러 주세요</span>
    )}
    </span>
  )
}
