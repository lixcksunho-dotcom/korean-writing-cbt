'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// 페이지 이동마다 익명 비콘을 /api/track로 보낸다.
// visitor_id(영구, 순방문자 집계) / session_id(세션) 모두 난수 — 개인정보 아님.
function getId(store: Storage, key: string): string {
  try {
    let v = store.getItem(key)
    if (!v) {
      v = crypto.randomUUID()
      store.setItem(key, v)
    }
    return v
  } catch {
    return 'anon'
  }
}

export default function TrafficTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return

    const body = JSON.stringify({
      path: pathname,
      visitorId: getId(localStorage, 'kpt_vid'),
      sessionId: getId(sessionStorage, 'kpt_sid'),
      referrer: document.referrer || null,
    })

    try {
      const blob = new Blob([body], { type: 'application/json' })
      if (!navigator.sendBeacon('/api/track', blob)) throw new Error('beacon failed')
    } catch {
      fetch('/api/track', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {})
    }
  }, [pathname])

  return null
}
