import { createAdminClient } from '@/lib/supabase/admin'

// 방문 페이지뷰 + 퍼널 이벤트 기록(비콘). 익명 visitor_id만 저장하며, 실패해도 사용자 경험에 영향 없음.
// event가 오면 path를 "#event/<name>"으로 저장 → page_views 재사용(별도 테이블/DDL 불필요).
// 전환 측정 쿼리 예: select count(*) from page_views where path='#event/purchase_success';
// 이 라우트는 인증 없이 service_role로 쓴다(비콘이라 로그인 전에도 찍혀야 함).
// 그래서 '무엇이 들어올 수 있는지'를 좁히는 게 유일한 방어선이다. 형식이 안 맞으면 조용히 버린다.
// (호출 빈도 제한은 여기서 못 한다 — 필요해지면 Vercel WAF/Edge 레벨에서 걸어야 한다.)
const EVENT_NAME = /^[a-z0-9_]{1,40}$/
const MAX_PATH = 512

export async function POST(req: Request) {
  try {
    const { path, event, meta, visitorId, sessionId, referrer } = await req.json()

    // 퍼널 이벤트 모드
    if (typeof event === 'string' && EVENT_NAME.test(event)) {
      const admin = createAdminClient()
      await admin.from('page_views').insert({
        path: `#event/${event}`.slice(0, 512),
        visitor_id: typeof visitorId === 'string' ? visitorId.slice(0, 64) : null,
        session_id: typeof sessionId === 'string' ? sessionId.slice(0, 64) : null,
        referrer: typeof meta === 'string' && meta ? meta.slice(0, 512) : null,
      })
      return new Response(null, { status: 204 })
    }

    // 페이지뷰 모드(기존) — 실제 경로 형태만 받는다(임의 문자열로 통계를 오염시키지 못하게).
    if (typeof path !== 'string' || !path.startsWith('/') || path.length > MAX_PATH) {
      return new Response(null, { status: 204 })
    }
    // 관리자·API·내부 경로는 방문 트래픽에서 제외(오너 방문이 통계를 부풀리지 않도록)
    if (path.startsWith('/admin') || path.startsWith('/api')) return new Response(null, { status: 204 })

    const admin = createAdminClient()
    await admin.from('page_views').insert({
      path: path.slice(0, 512),
      visitor_id: typeof visitorId === 'string' ? visitorId.slice(0, 64) : null,
      session_id: typeof sessionId === 'string' ? sessionId.slice(0, 64) : null,
      referrer: typeof referrer === 'string' && referrer ? referrer.slice(0, 512) : null,
    })
  } catch {
    // 무시(조용히 실패)
  }
  return new Response(null, { status: 204 })
}
