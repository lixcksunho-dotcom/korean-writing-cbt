'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Eye } from 'lucide-react'
import { BLOG_EVENT_POPUP_ENABLED } from '@/lib/blogPromoRules'

// 손님에게 보일 팝업을 여기서 그대로 띄워 본다.
//
// 왜 필요한가: 팝업은 손님 쪽에서 문이 여러 겹이다 — 이미 이용권이 있으면 안 뜨고,
// 한 번 '7일 동안 보지 않기'를 누르면 일주일간 안 뜬다. 그래서 정작 만든 사람이
// 화면을 확인하기가 가장 어렵다. 실제로 켜기 전에 눈으로 보고 고칠 자리가 필요하다.
//
// 여기서 띄우는 것은 미리보기일 뿐, 손님 화면과는 무관하다. 홈에 실제로 뜨는지는
// BLOG_EVENT_POPUP_ENABLED 가 정한다.
const EventPopup = dynamic(() => import('@/components/promo/EventPopup'), { ssr: false })

export default function EventPopupPreview() {
  const [shown, setShown] = useState(0)

  return (
    <div className="mb-6 rounded-xl border border-[#e2e8f0] bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShown(n => n + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a5f] px-3.5 py-2 text-sm font-bold text-white hover:bg-[#0f1f3d]"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          이벤트 팝업 띄워 보기
        </button>
        <span className="text-xs text-[#64748b]">
          손님 화면에 실제로 뜨는지는{' '}
          <b className={BLOG_EVENT_POPUP_ENABLED ? 'text-emerald-700' : 'text-[#b45309]'}>
            {BLOG_EVENT_POPUP_ENABLED ? '켜짐' : '꺼짐'}
          </b>
          {' '}— 여기서 띄우는 것은 미리보기라 손님 화면과 무관해요.
        </span>
      </div>

      {shown > 0 && (
        // key를 바꿔 다시 마운트한다 — 닫은 뒤 다시 누르면 또 떠야 한다.
        <EventPopup key={shown} enabled preview />
      )}
    </div>
  )
}
