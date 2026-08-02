'use client'

// 첫 방문 시 1회 뜨는 안내 팝업 — KBS한국어능력시험 추가를 알리고 모드를 고르게 한다.
import { useState, useSyncExternalStore, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setActiveProgram } from '@/app/(main)/mode-actions'
import { PROGRAMS, type ProgramId } from '@/lib/programs'
import { BookOpen, GraduationCap, X } from 'lucide-react'

const SEEN_KEY = 'kptest_mode_intro_v1'

// localStorage는 읽기만 하고 구독할 게 없다(다른 탭 변화까지 따라갈 필요가 없는 1회성 안내).
const noSubscribe = () => () => {}
const readSeen = () => {
  try {
    return !!localStorage.getItem(SEEN_KEY)
  } catch {
    return true // 접근 불가면 띄우지 않는다
  }
}

export default function ModeIntroModal({ current }: { current: ProgramId }) {
  // 서버에서는 '이미 봤음'으로 렌더해 하이드레이션 불일치 없이 클라이언트에서만 뜬다.
  const alreadySeen = useSyncExternalStore(noSubscribe, readSeen, () => true)
  const [dismissed, setDismissed] = useState(false)
  const open = !alreadySeen && !dismissed
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function seen() {
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* noop */
    }
  }

  function dismiss() {
    seen()
    setDismissed(true)
  }

  function choose(id: ProgramId) {
    seen()
    startTransition(async () => {
      if (id !== current) {
        await setActiveProgram(id)
        router.refresh()
      }
      setDismissed(true)
    })
  }

  if (!open) return null

  const cards: { id: ProgramId; icon: typeof BookOpen; desc: string; accent: string }[] = [
    { id: 'silyong', icon: BookOpen, desc: '원고지·서술형 자격 대비 CBT', accent: 'from-blue-500 to-[#1e3a5f]' },
    { id: 'kbs', icon: GraduationCap, desc: '국가공인 국어능력 시험 대비', accent: 'from-emerald-500 to-teal-600' },
  ]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="absolute top-4 right-4 text-[#64748b] hover:text-[#0f172a] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full mb-3">
          NEW
        </div>
        <h2 className="text-lg font-black text-[#0f172a] mb-1">
          이제 <span className="text-gradient-gold">KBS한국어능력시험</span>까지
        </h2>
        <p className="text-sm text-[#64748b] mb-5">
          한 계정에서 두 시험을 준비하세요. 어떤 시험부터 볼까요? (언제든 상단에서 전환할 수 있어요.)
        </p>

        <div className="grid grid-cols-2 gap-3">
          {cards.map(({ id, icon: Icon, desc, accent }) => (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              disabled={pending}
              className="group text-left rounded-2xl border border-[#e2e8f0] p-4 hover:border-[#1e3a5f]/40 hover:shadow-md transition-all disabled:opacity-60"
            >
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${accent} mb-3 shadow`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="font-bold text-[#0f172a] text-sm leading-tight">{PROGRAMS[id].examName}</div>
              <div className="text-xs text-[#64748b] mt-1">{desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
