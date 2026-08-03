// 클라이언트에서 퍼널 이벤트를 /api/track로 보냄(익명 비콘). GA4 없이도 전환 측정 가능.
// TrafficTracker와 동일한 visitor/session id를 재사용해 방문→전환을 연결한다.
export function trackEvent(event: string, meta?: string) {
  if (typeof window === 'undefined') return
  let visitorId = 'anon'
  let sessionId = 'anon'
  try {
    // 자동화된 브라우저는 세지 않는다 — 이유는 TrafficTracker 주석 참고.
    if (navigator.webdriver || localStorage.getItem('kpt_no_track') === '1') return
    visitorId = localStorage.getItem('kpt_vid') || 'anon'
    sessionId = sessionStorage.getItem('kpt_sid') || 'anon'
  } catch {
    // storage 접근 불가 — 익명 처리
  }
  const body = JSON.stringify({ event, meta: meta ?? null, visitorId, sessionId })
  try {
    const blob = new Blob([body], { type: 'application/json' })
    if (!navigator.sendBeacon('/api/track', blob)) throw new Error('beacon failed')
  } catch {
    try {
      fetch('/api/track', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {})
    } catch {
      // 무시
    }
  }
}
