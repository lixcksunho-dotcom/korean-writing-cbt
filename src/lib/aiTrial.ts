import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 비구독자에게 주는 무료 AI 분석 체험 횟수.
// 마이그레이션 없이 Supabase Auth의 app_metadata(ai_trial_used)로 사용량을 기록한다.
// app_metadata는 service_role로만 수정 가능하므로 사용자가 위조할 수 없다.
export const FREE_AI_TRIAL = 1

/** 현재 로그인 사용자의 무료 체험 사용/잔여 횟수 */
export async function getAiTrialStatus(): Promise<{ used: number; remaining: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const used = Number(user?.app_metadata?.ai_trial_used ?? 0)
  return { used, remaining: Math.max(0, FREE_AI_TRIAL - used) }
}

/**
 * 무료 체험 1회 차감(서버 전용). 남아 있으면 차감 후 true, 소진됐으면 false.
 * AI 분석이 성공한 뒤 호출해 실패 시 체험이 낭비되지 않게 한다.
 */
export async function consumeAiTrial(userId: string, currentUsed: number): Promise<boolean> {
  if (currentUsed >= FREE_AI_TRIAL) return false
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ai_trial_used: currentUsed + 1 },
  })
  return !error
}
