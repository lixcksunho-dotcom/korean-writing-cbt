import { createAdminClient } from '@/lib/supabase/admin'

// 결제창까지 갔다가 안 낸 사람을 찾는다(대시보드의 '이어서 결제' 넛지용).
//
// 대시보드 본문에 두면 안 되는 이유가 둘 있다.
//  - Date.now()는 렌더 본문에서 못 부른다(react-hooks/purity). 서버 컴포넌트라
//    실제 위험은 없지만, 규칙을 끄는 것보다 자리를 옮기는 편이 낫다.
//  - page_views는 RLS만 켜져 있고 정책이 없어 service_role로만 조회된다.
//    그 사실이 화면 코드에 섞여 있으면 다음 사람이 사용자 클라이언트로 바꿔 쓰기 쉽다.

const TOO_FRESH_MS = 10 * 60_000            // 방금 이탈한 사람에게 바로 들이대지 않는다
const TOO_OLD_MS = 14 * 24 * 60 * 60_000    // 2주가 지나면 다른 맥락이다

/** 결제창을 열었지만 결제하지 않은 흔적이 '적당히 최근'인가. 조회 실패는 false. */
export async function hasAbandonedCheckout(userId: string): Promise<boolean> {
  try {
    const { data } = await createAdminClient()
      .from('page_views')
      .select('created_at')
      .eq('path', '#event/payment_started')
      .eq('visitor_id', `u:${userId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data?.created_at) return false
    const ageMs = Date.now() - new Date(data.created_at as string).getTime()
    return ageMs > TOO_FRESH_MS && ageMs < TOO_OLD_MS
  } catch {
    return false // 조용히 실패 — 대시보드 렌더링을 막지 않는다
  }
}
