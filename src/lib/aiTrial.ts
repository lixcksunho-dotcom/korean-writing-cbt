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
  const used = user ? await readTrialUsed(user.id, Number(user.app_metadata?.ai_trial_used ?? 0)) : 0
  return { used, remaining: Math.max(0, FREE_AI_TRIAL - used) }
}

/**
 * 사용 횟수를 읽는다. 035가 적용됐으면 새 표가 진짜 값이다 —
 * 차감은 새 표에 하는데 판정을 옛 값으로 하면 둘이 갈려서 한도가 무의미해진다.
 */
export async function readTrialUsed(userId: string, fallback: number): Promise<number> {
  const { data, error } = await createAdminClient()
    .from('ai_trial_usage')
    .select('used')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return fallback // 035 미적용
  return Number(data?.used ?? 0)
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

  // 먼저 DB 한 문장으로 차감해 본다(마이그레이션 035). 읽고-검사하고-쓰는 방식은
  // 같은 계정으로 동시에 N개를 던지면 전부 통과해서 유료 API가 N번 불린다.
  // UPDATE ... WHERE used < limit 은 행 잠금으로 직렬화돼 그게 안 된다.
  const { data, error: rpcError } = await admin.rpc('consume_ai_trial', {
    p_user: userId,
    p_limit: FREE_AI_TRIAL,
  })
  if (!rpcError) return data === true

  // 035를 아직 실행하지 않은 상태. 예전 방식으로 돈다 — 여기서 막아 버리면
  // SQL을 돌리기 전까지 아무도 체험을 못 한다.
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
  const admin = createAdminClient()
  try {
    const { error: rpcError } = await admin.rpc('refund_ai_trial', { p_user: userId })
    if (!rpcError) return
    const { error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ai_trial_used: currentUsed - 1 },
    })
    if (error) throw error
  } catch (e) {
    // 되돌리기까지 실패하면 그 사용자는 아무것도 못 받고 횟수만 잃는다.
    // 여기서 다시 던지면 원래 오류를 덮으니, 남겨만 두고 넘어간다.
    console.error('[aiTrial] 체험 횟수 되돌리기 실패 — 사용자가 횟수를 잃은 상태', {
      userId,
      currentUsed,
      message: e instanceof Error ? e.message : String(e),
    })
  }
}
