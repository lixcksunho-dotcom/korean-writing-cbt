import { createAdminClient } from '@/lib/supabase/admin'

// 회원을 지우되 결제 기록은 남긴다 — 본인 탈퇴와 관리자 삭제가 같은 길을 쓴다.
//
// 왜 이렇게 하나: subscriptions.user_id 가 auth.users 에 ON DELETE CASCADE + NOT NULL 이라
// 그냥 지우면 그 사람의 결제 기록이 함께 사라진다(누적 매출이 줄고, 환불·분쟁 근거가 없어지고,
// 전자상거래법의 5년 보존과 어긋난다). 마이그레이션 036(user_id 를 NULL 허용)은 라이브에 아직
// 적용되지 않았다(2026-09-07 실측: null 삽입 23502). SQL 편집기는 사람만 열 수 있으므로,
// 마이그레이션 없이도 되는 방법을 쓴다 — 결제 행을 '탈퇴 회원 보관 계정'으로 옮긴다.
// 거래가 있었다는 사실은 남고 '누가 샀는지'만 끊긴다. 036 이 적용된 뒤에도 이 방식은 그대로 동작한다.
//
// 그 밖의 개인 기록(풀이 세션·답안·원고·후기·북마크·기기·AI 체험)은 FK CASCADE 로 함께 지워지고,
// 불편사항·문항 신고는 SET NULL 로 글만 남는다.

import { WITHDRAWN_HOLDER_EMAIL } from './accountDeletionConstants'
export { WITHDRAWN_HOLDER_EMAIL }

type Admin = ReturnType<typeof createAdminClient>

let holderIdCache: string | null = null

async function withdrawnHolderId(admin: Admin): Promise<string> {
  if (holderIdCache) return holderIdCache
  // 먼저 만들어 본다 — 이미 있으면 목록에서 찾는다(관리 API 에 이메일 단건 조회가 없다).
  const created = await admin.auth.admin.createUser({
    email: WITHDRAWN_HOLDER_EMAIL,
    // bcrypt 는 72자까지만 본다 — 그보다 길면 GoTrue 가 500 을 낸다(UUID 둘을 이었다가 실제로 막혔다).
    password: `Hold-${crypto.randomUUID()}-aA1!`,
    email_confirm: true,
  })
  if (created.data.user?.id) { holderIdCache = created.data.user.id; return holderIdCache }
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    const hit = data?.users?.find((u) => u.email === WITHDRAWN_HOLDER_EMAIL)
    if (hit) { holderIdCache = hit.id; return hit.id }
    if (!data?.users?.length || data.users.length < 1000) break
  }
  throw new Error('탈퇴 회원 보관 계정을 만들거나 찾지 못했다')
}

export type DeleteAccountResult =
  | { ok: true; movedPayments: number }
  | { ok: false; reason: 'ledger' | 'auth'; detail: string }

export async function deleteAccountKeepingPayments(userId: string): Promise<DeleteAccountResult> {
  const admin = createAdminClient()
  if (userId === holderIdCache) return { ok: false, reason: 'auth', detail: '보관 계정은 지울 수 없다' }

  const { data: subs, error: readErr } = await admin.from('subscriptions').select('id').eq('user_id', userId)
  if (readErr) return { ok: false, reason: 'ledger', detail: readErr.message }

  let moved = 0
  if (subs && subs.length > 0) {
    const holder = await withdrawnHolderId(admin)
    const { data: movedRows, error: moveErr } = await admin
      .from('subscriptions')
      .update({ user_id: holder })
      .eq('user_id', userId)
      .select('id')
    // 옮기지 못했으면 지우지 않는다 — 결제 기록을 잃는 것보다 탈퇴가 하루 늦는 편이 낫다.
    if (moveErr || (movedRows?.length ?? 0) !== subs.length) {
      return { ok: false, reason: 'ledger', detail: moveErr?.message ?? `결제 기록 ${subs.length}건 중 ${movedRows?.length ?? 0}건만 보관됨` }
    }
    moved = movedRows?.length ?? 0
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { ok: false, reason: 'auth', detail: error.message }
  return { ok: true, movedPayments: moved }
}
