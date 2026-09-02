import { createAdminClient } from '@/lib/supabase/admin'
import { MAX_REWARDS } from '@/lib/blogPromoRules'

// 블로그 후기 답례를 몇 자리 남겨 뒀는지 센다.
//
// 왜 한도가 필요한가: 이 답례는 공짜가 아니다. 7일 이용권 하나가 AI 채점을 하루 30회,
// 최대 210회까지 쓸 수 있고 그건 그대로 API 비용이다. 인원을 안 막으면 원가가 열려 있다.
//
// 회수된 자리는 돌려받는다(status='cancelled'). 광고가 사라졌으면 답례도 없던 일이 되고,
// 그 자리는 다음 사람에게 가는 게 맞다. 기간이 지난 것은 자리를 돌려주지 않는다 —
// 그 사람은 약속대로 받아 간 것이다.

export const BLOG_REWARD_ORDER_PREFIX = 'review-'

export type RewardQuota = { used: number; total: number; left: number; closed: boolean }

export async function blogRewardQuota(): Promise<RewardQuota> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .like('order_id', `${BLOG_REWARD_ORDER_PREFIX}%`)
    .eq('status', 'active')

  const used = count ?? 0
  const left = Math.max(0, MAX_REWARDS - used)
  return { used, total: MAX_REWARDS, left, closed: left === 0 }
}
