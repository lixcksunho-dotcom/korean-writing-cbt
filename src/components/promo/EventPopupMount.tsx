'use client'

import dynamic from 'next/dynamic'

// 팝업은 첫 화면에 없는데, 정적으로 물면 그 안의 Supabase SDK(63KB)가 홈 방문자
// 전원에게 먼저 내려간다. 지금은 팝업이 꺼져 있어 한 명도 못 보는 코드를 받는 셈이다.
const EventPopup = dynamic(() => import('./EventPopup'), { ssr: false })

export default function EventPopupMount({ enabled }: { enabled: boolean }) {
  // 꺼져 있으면 import 자체가 일어나지 않는다.
  if (!enabled) return null
  return <EventPopup enabled />
}
