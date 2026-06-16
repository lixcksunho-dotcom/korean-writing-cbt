import { createAdminClient } from '@/lib/supabase/admin'

// 방문 페이지뷰 기록(비콘). 익명 visitor_id만 저장하며, 실패해도 사용자 경험에 영향 없음.
export async function POST(req: Request) {
  try {
    const { path, visitorId, sessionId, referrer } = await req.json()
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
