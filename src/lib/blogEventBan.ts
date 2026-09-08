import { createAdminClient } from '@/lib/supabase/admin'
import { GRANT_KEY_VIOLATED } from './blogPromoRules'

/**
 * 이 계정이 후기 이벤트에서 막혔는가 — 기간 안에 글을 내려 이용권이 회수된 적이 있는지.
 *
 * 왜 필요한가: 회수만 하면 같은 사람이 다음 날 다시 신청해서 또 받아 간다. 받고 내리기를
 * 되풀이하면 홍보는 하나도 안 남고 이용권만 계속 나간다(운영자 결정 2026-09-08).
 *
 * 표시는 subscriptions 행에 남긴다 — 차단 명단을 따로 만들면 회수와 차단이 어긋난다.
 */
export async function isBannedFromBlogEvent(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('payment_key', GRANT_KEY_VIOLATED)
    .limit(1)
  return !!data?.length
}
