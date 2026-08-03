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

// 자동화된 브라우저(검사 스크립트·크롤러)는 세지 않는다.
// 검사를 돌릴 때마다 새 브라우저 컨텍스트가 생겨 매번 '새 순방문자'로 잡히는데,
// 그 상태로 퍼널을 보면 유입의 대부분이 봇이 된다(실제로 방문자 1035명 중 상당수가
// 그랬고, 진입 경로 2위가 /login이었다 — 사람은 로그인 화면으로 처음 들어오지 않는다).
// navigator.webdriver는 Playwright·Selenium 같은 자동화가 켜 두는 표준 신호다.
function isAutomated(): boolean {
  try {
    if (navigator.webdriver) return true
    return localStorage.getItem('kpt_no_track') === '1'
  } catch {
    return false
  }
}

export default function TrafficTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return
    if (isAutomated()) return

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
