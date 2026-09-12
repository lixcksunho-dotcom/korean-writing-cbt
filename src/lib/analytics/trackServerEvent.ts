import { createAdminClient } from '@/lib/supabase/admin'

// 서버 액션에서 퍼널 이벤트 기록(로그인 사용자 기준). page_views 재사용(#event/<name>),
// visitor_id는 "u:<userId>"로 저장해 유저 단위 집계. 실패해도 절대 throw하지 않음(핵심 로직 보호).
export async function trackServerEvent(event: string, userId?: string, meta?: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('page_views').insert({
      path: `#event/${event}`.slice(0, 512),
      visitor_id: userId ? `u:${userId}`.slice(0, 64) : null,
      referrer: meta ? meta.slice(0, 512) : null,
    })
    if (error) {
      console.error('[trackServerEvent] 이벤트 기록 실패 — 퍼널 통계에 반영되지 않음', { code: error.code, message: error.message })
    }
  } catch (error) {
    console.error('[trackServerEvent] 이벤트 기록 예외 — 퍼널 통계에 반영되지 않음', {
      code: 'exception', message: error instanceof Error ? error.message : String(error),
    })
  }
}
