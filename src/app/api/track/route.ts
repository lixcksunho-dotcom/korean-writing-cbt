import { createAdminClient } from '@/lib/supabase/admin'

// 방문 페이지뷰 + 퍼널 이벤트 기록(비콘). 익명 visitor_id만 저장하며, 실패해도 사용자 경험에 영향 없음.
// event가 오면 path를 "#event/<name>"으로 저장 → page_views 재사용(별도 테이블/DDL 불필요).
// 전환 측정 쿼리 예: select count(*) from page_views where path='#event/purchase_success';
export async function POST(req: Request) {
  try {
    const { path, event, meta, visitorId, sessionId, referrer } = await req.json()

    // 퍼널 이벤트 모드
    if (typeof event === 'string' && event) {
      const admin = createAdminClient()
      await admin.from('page_views').insert({
        path: `#event/${event}`.slice(0, 512),
        visitor_id: typeof visitorId === 'string' ? visitorId.slice(0, 64) : null,
        session_id: typeof sessionId === 'string' ? sessionId.slice(0, 64) : null,
        referrer: typeof meta === 'string' && meta ? meta.slice(0, 512) : null,
      })
      return new Response(null, { status: 204 })
    }

    // 페이지뷰 모드(기존)
    if (typeof path !== 'string' || !path) return new Response(null, { status: 204 })
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
