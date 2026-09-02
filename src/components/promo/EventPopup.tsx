'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X, Gift, Check } from 'lucide-react'
import { useDialogFocus } from '@/components/ui/dialogFocus'
import { createClient } from '@/lib/supabase/client'
import { BODY_KEYWORDS, MIN_CHARS, MIN_IMAGES, MIN_QA, REWARD_DAYS } from '@/lib/blogPromoRules'

// 첫 화면에 이벤트를 알린다.
//
// 팝업은 쉽게 미움받는다. 세 가지로 줄였다.
//   · 이미 이용권이 있는 사람에게는 띄우지 않는다(줄 것이 없다).
//   · '오늘 하루 보지 않기'를 누르면 그날은 안 나온다. 그냥 닫으면 이번 방문만 쉰다.
//   · 첫 화면 말고는 어디에도 안 띄운다.
//
// 저장은 브라우저에만 한다 — 안 뜨는 게 서버 문제로 번지면 안 된다.

const KEY = 'sgp_event_popup_hidden_until'

function hiddenToday(): boolean {
  try {
    const until = localStorage.getItem(KEY)
    return !!until && Date.now() < Number(until)
  } catch {
    return false // 저장이 막힌 브라우저에서는 그냥 보여 준다
  }
}

export default function EventPopup({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    if (hiddenToday()) return

    let cancelled = false
    let poll: ReturnType<typeof setInterval> | undefined
    const timer = setTimeout(async () => {
      // 이미 이용권이 있는 사람에게 '무료로 받으세요'는 실례다. 첫 화면은 정적으로 그려서
      // 서버가 로그인 상태를 모르므로 여기서 확인한다(첫 그림을 늦추지 않게 나중에 한 번).
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .limit(1)
          if (data && data.length > 0) return
        }
      } catch {
        // 확인에 실패하면 그냥 보여 준다 — 안 뜨는 것보다 낫다
      }
      if (cancelled) return

      // 자동으로 뜨는 창은 한 번에 하나만. 시험 일정 안내가 떠 있으면 그게 닫힐 때까지 기다린다 —
      // 둘이 겹쳐 뜨면 사람은 내용을 안 읽고 둘 다 닫는다(실측).
      const show = () => { if (!cancelled) setOpen(true) }
      if (!document.querySelector('[role="dialog"]')) return show()

      let waited = 0
      poll = setInterval(() => {
        waited += 700
        if (cancelled) return clearInterval(poll)
        if (!document.querySelector('[role="dialog"]') || waited > 60000) {
          clearInterval(poll)
          show()
        }
      }, 700)
    }, 900)

    return () => { cancelled = true; clearTimeout(timer); if (poll) clearInterval(poll) }
  }, [enabled])

  useDialogFocus(open, ref, () => setOpen(false))


  function hideForToday() {
    try {
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      localStorage.setItem(KEY, String(midnight.getTime()))
    } catch {
      // 저장이 막혀 있으면 이번 방문만 닫힌다
    }
    setOpen(false)
  }

  const conditions = [
    `제목과 본문에 정해진 낱말 (${BODY_KEYWORDS.length}개)`,
    `사진 ${MIN_IMAGES}장 이상 · 본문 ${MIN_CHARS.toLocaleString('ko-KR')}자 이상`,
    `스스로 묻고 답한 곳 ${MIN_QA}번 이상`,
    '광고 표시 문구 (법정 의무 · 복사해 드립니다)',
  ]

  if (!open || typeof document === 'undefined') return null

  // 첫 화면 안쪽에 두면 그 안의 다른 층에 가려 버튼이 눌리지 않는다(실측) — body로 옮긴다.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-popup-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="relative bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] px-6 py-7 text-center text-white">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15">
            <Gift className="h-5 w-5 text-amber-300" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold text-amber-300">블로그 후기 이벤트</p>
          <h2 id="event-popup-title" className="mt-1 text-xl font-black leading-snug">
            후기 한 편 쓰고
            <br />
            이용권 {REWARD_DAYS}일 무료로 받기
          </h2>
          <p className="mt-2 text-sm text-white/70">
            블로그에 후기를 올리고 주소만 넣으면 <b className="text-white">그 자리에서</b> 지급됩니다.
          </p>
        </div>

        <div className="px-6 py-5">
          <ul className="space-y-2">
            {conditions.map(c => (
              <li key={c} className="flex items-start gap-2 text-sm text-[#334155]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{c}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/subscribe?promo=1#blog-review"
            onClick={() => setOpen(false)}
            className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#1e3a5f] py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            어떻게 쓰는지 보기
          </Link>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-[#94a3b8]">
            계정당 1회 · 대가를 받고 쓰는 글이므로 광고 표시가 필요합니다.
            <br />
            지급 뒤 글을 내리면 이용권도 함께 꺼집니다.
          </p>
        </div>

        <button
          type="button"
          onClick={hideForToday}
          className="w-full border-t border-[#e2e8f0] py-3 text-xs font-semibold text-[#64748b] transition-colors hover:bg-[#f8fafc]"
        >
          오늘 하루 보지 않기
        </button>
      </div>
    </div>,
    document.body,
  )
}
