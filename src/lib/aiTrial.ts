import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 비구독자에게 주는 무료 AI 분석 체험 횟수.
// 마이그레이션 없이 Supabase Auth의 app_metadata(ai_trial_used)로 사용량을 기록한다.
// app_metadata는 service_role로만 수정 가능하므로 사용자가 위조할 수 없다.
// 3회 = 'aha' 체험을 충분히 주되, 무제한은 막아 전환을 유도(전환율 레버).
export const FREE_AI_TRIAL = 3

/** 현재 로그인 사용자의 무료 체험 사용/잔여 횟수 */
export async function getAiTrialStatus(): Promise<{ used: number; remaining: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const used = Number(user?.app_metadata?.ai_trial_used ?? 0)
  return { used, remaining: Math.max(0, FREE_AI_TRIAL - used) }
}

/**
 * 무료 체험 1회 차감(서버 전용). 남아 있으면 차감 후 true, 소진됐으면 false.
 *
 * 호출 순서는 AI 호출 '앞'이다. 성공한 뒤에 차감하면, 응답 파싱이 깨지는 입력을 골라
 * 무한히 재시도할 수 있고 그동안 요금은 계속 나간다.
 * 대신 통신·API 오류로 응답 자체를 못 받은 경우에는 refundAiTrial로 되돌린다.
 */
export async function consumeAiTrial(userId: string, currentUsed: number): Promise<boolean> {
  if (currentUsed >= FREE_AI_TRIAL) return false
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ai_trial_used: currentUsed + 1 },
  })
  return !error
}

/**
 * 차감분 1회 되돌리기. 응답 자체를 못 받았을 때(통신 끊김, 5xx, 타임아웃)만 쓴다.
 *
 * 파싱 실패에는 절대 쓰지 않는다 — 그러면 파싱이 깨지는 입력을 골라 공짜로 무한히
 * 호출하는 통로가 열린다. 그건 사용자 입력으로 만들 수 있지만, 응답을 못 받는 상황은
 * 우리 쪽 사정이라 사용자가 체험 횟수를 잃을 이유가 없다.
 */
export async function refundAiTrial(userId: string, currentUsed: number): Promise<void> {
  if (currentUsed <= 0) return
  try {
    const admin = createAdminClient()
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ai_trial_used: currentUsed - 1 },
    })
  } catch {
    // 되돌리기까지 실패하면 어쩔 수 없다. 원래 오류를 덮지 않는 게 더 중요하다.
  }
}
