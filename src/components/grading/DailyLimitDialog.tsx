'use client'

import { useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Clock, X } from 'lucide-react'
import { useDialogFocus } from '@/components/ui/dialogFocus'
import { DAILY_GRADE_LIMIT } from '@/lib/antiSharingLimits'

// 하루 AI 첨삭 한도에 걸린 사람에게 '왜·언제까지'를 설명하는 창.
//
// 왜 필요한가: 한 줄 빨간 글씨("한도를 모두 사용했어요")만 보면 유료 회원은 "유료인데 왜 제한?"이라고
// 묻는다(2026-09-07 실제 문의). 상한은 그대로 두되(운영자 결정), 걸린 순간 이유·풀리는 시각·
// 정상 이용자의 출구(고객센터에서 늘려 준다)를 한 화면에 보여 준다.

/** 한국 시간 자정까지 남은 시간(분). 서버·브라우저 시간대와 무관하게 Asia/Seoul 로 센다. */
function minutesToKstMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return 24 * 60 - (h * 60 + m)
}

export default function DailyLimitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useDialogFocus(open, ref, onClose)
  // 남은 시간은 연 순간 기준 — 분 단위라 갱신 타이머는 두지 않는다.
  const left = useMemo(() => (open ? minutesToKstMidnight() : 0), [open])
  const leftText = left >= 60 ? `${Math.floor(left / 60)}시간 ${left % 60}분` : `${left}분`

  // open 은 채점 버튼을 누른 뒤(브라우저에서)만 참이 되므로 서버 렌더에서는 늘 null — document 접근이 안전하다.
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-limit-title"
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-[#0f172a] text-white px-6 pt-6 pb-5">
          <button onClick={onClose} aria-label="닫기" className="absolute top-4 right-4 text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
          <div className="inline-flex items-center gap-1.5 bg-white/10 text-white/90 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
            <Clock className="h-3.5 w-3.5" />
            오늘 한도
          </div>
          <h2 id="daily-limit-title" className="text-lg font-black">오늘 AI 첨삭 {DAILY_GRADE_LIMIT}회를 다 쓰셨어요</h2>
          <p className="text-white/70 text-sm mt-1">한국 시간 자정에 다시 열려요 · 약 {leftText} 남음</p>
        </div>
        <div className="px-6 py-5 text-sm text-[#334155] leading-relaxed space-y-3">
          <p>
            이용권 기간 중 첨삭 <b className="text-[#0f172a]">횟수 제한은 없어요.</b> 다만 계정 공유와 자동화·대량 이용을 막기 위해
            <b className="text-[#0f172a]"> 하루 {DAILY_GRADE_LIMIT}회</b>까지만 받을 수 있게 되어 있어요. 서술형 9문항 기준으로 모의고사 3회 분량이에요.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#475569]">
            <li>오늘 받은 첨삭 결과는 그대로 남아 있어요 — 결과 화면에서 다시 볼 수 있어요.</li>
            <li>자정이 지나면 아무것도 안 해도 다시 {DAILY_GRADE_LIMIT}회가 열려요.</li>
            <li>정상적으로 공부하다 걸리셨다면 알려 주세요. 확인 뒤 늘려 드려요.</li>
          </ul>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 min-h-[44px] rounded-xl bg-[#1e3a5f] text-white text-sm font-bold">알겠어요</button>
            <Link href="/support" className="flex-1 min-h-[44px] inline-flex items-center justify-center rounded-xl border border-[#e2e8f0] text-sm font-bold text-[#0f172a]">고객센터에 알리기</Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
