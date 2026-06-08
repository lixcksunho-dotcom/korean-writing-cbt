import { createClient } from '@/lib/supabase/server'

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

export function daysUntilExpiry(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/** 결제 건이 현재 시점 기준 유효(이용 중)한지 — 서버 컴포넌트 렌더에서 Date.now() 직접 호출을 피하려고 lib에 캡슐화 */
export function isActivePass(status: string, expiresAt: string): boolean {
  return status === 'active' && new Date(expiresAt).getTime() >= Date.now()
}
