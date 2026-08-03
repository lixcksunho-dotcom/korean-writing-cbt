'use client'

// 실글모드 ⇄ KBS모드 전환 토글.
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setActiveProgram } from '@/app/(main)/mode-actions'
import { PROGRAMS, type ProgramId } from '@/lib/programs'

const ORDER: ProgramId[] = ['silyong', 'kbs']

export default function ModeSwitcher({
  current,
  className = '',
}: {
  current: ProgramId
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function pick(id: ProgramId) {
    if (id === current || pending) return
    startTransition(async () => {
      await setActiveProgram(id)
      router.refresh()
    })
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 p-1 ${className}`}
      role="tablist"
      aria-label="시험 모드 선택"
    >
      {ORDER.map((id) => {
        const active = id === current
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => pick(id)}
            disabled={pending}
            className={`px-3.5 py-3.5 rounded-full text-xs font-bold transition-all disabled:opacity-60 ${
              active
                ? 'bg-white text-[#0f1f3d] shadow'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {PROGRAMS[id].shortLabel}
          </button>
        )
      })}
    </div>
  )
}
