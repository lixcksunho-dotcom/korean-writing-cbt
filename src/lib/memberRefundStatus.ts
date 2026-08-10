import { createAdminClient } from '@/lib/supabase/admin'
import { judgeRefund, type RefundJudgement } from '@/lib/refundEligibility'

// 회원별 환불 판정을 한 번에 만든다. 판정 규칙 자체는 refundEligibility.ts(순수 함수)에
// 있고, 여기는 그 규칙에 먹일 값(마지막 결제일 · 그 이후 AI 사용 횟수)을 모으는 일만 한다.
//
// 화면(서버 컴포넌트)에서 Date.now()를 부르면 react-hooks/purity에 걸린다. 시각을 읽는
// 자리를 여기로 옮겨 두면 화면은 순수하게 남고, 판정은 여전히 검사 가능하다.

/** 하루 단위로 쌓이는 표라 회원이 늘면 1000줄을 넘는다 — PostgREST는 말없이 자른다. */
async function allUsageDays(admin: ReturnType<typeof createAdminClient>) {
  const rows: { user_id: string; day: string; grade_count: number }[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from('usage_daily')
      .select('user_id, day, grade_count')
      .order('day', { ascending: true })
      .range(from, from + 999)
    const batch = (data ?? []) as typeof rows
    rows.push(...batch)
    if (batch.length < 1000) break
  }
  return rows
}

type Sub = { user_id: string; started_at: string | null }

/**
 * @param subs 이미 읽어 둔 구독 목록을 넘기면 다시 읽지 않는다.
 * @returns user_id → 판정. 결제 이력이 없는 회원은 넣지 않는다.
 */
export async function memberRefundStatus(subs: Sub[]): Promise<Map<string, RefundJudgement>> {
  // 마지막 결제일 — 재결제한 사람을 옛 결제로 판정하면 안 된다.
  const lastPaidAt = new Map<string, string>()
  for (const s of subs) {
    if (!s.started_at) continue
    const cur = lastPaidAt.get(s.user_id)
    if (!cur || s.started_at > cur) lastPaidAt.set(s.user_id, s.started_at)
  }
  if (lastPaidAt.size === 0) return new Map()

  // 그 결제 이후의 AI 채점만 센다. usage_daily.day는 'YYYY-MM-DD'.
  const graded = new Map<string, number>()
  for (const r of await allUsageDays(createAdminClient())) {
    const paid = lastPaidAt.get(r.user_id)
    if (!paid || r.day < paid.slice(0, 10)) continue
    graded.set(r.user_id, (graded.get(r.user_id) ?? 0) + (r.grade_count ?? 0))
  }

  const now = Date.now()
  const out = new Map<string, RefundJudgement>()
  for (const [userId, paidAt] of lastPaidAt) {
    out.set(userId, judgeRefund(paidAt, graded.get(userId) ?? 0, now))
  }
  return out
}
