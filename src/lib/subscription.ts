import { createClient } from '@/lib/supabase/server'

// 화면 표시용 순수 함수는 subscriptionDisplay.ts 에 있다(검사 스크립트·브라우저에서도 읽어야 해서).
// 기존 import 경로를 깨지 않도록 여기서 다시 내보낸다.
export { daysUntilExpiry, isActivePass, passDays, isExpiringSoon, passLabel } from './subscriptionDisplay'

export type Subscription = {
  id: string
  user_id: string
  payment_key: string
  order_id: string
  amount: number
  status: string
  started_at: string
  expires_at: string
}

export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}
