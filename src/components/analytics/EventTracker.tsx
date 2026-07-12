'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics/trackEvent'

// 마운트 시 퍼널 이벤트 1회 발송. 서버 컴포넌트 페이지에 끼워 뷰형 이벤트를 기록한다.
export default function EventTracker({ event, meta }: { event: string; meta?: string }) {
  useEffect(() => {
    trackEvent(event, meta)
  }, [event, meta])
  return null
}
