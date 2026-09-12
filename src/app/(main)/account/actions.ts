'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteAccountKeepingPayments } from '@/lib/accountDeletion'
import { DELETE_REASONS, DELETE_REASON_PATH } from '@/lib/accountDeletionConstants'
import { recordOperatorAlert } from '@/lib/operatorAlerts'

export type DeleteMyAccountResult = { ok: false; message: string }
export type DeleteMyAccountInput = { confirmEmail: string; reason: string; detail?: string }

/**
 * 본인 탈퇴. 사유를 골랐고 가입 이메일을 그대로 적었을 때만 지운다.
 *
 * 성공하면 세션을 끊고 완료 화면으로 보낸다(redirect 는 throw 라 반환값이 없다).
 * 결제 기록 보관에 실패하면 지우지 않고 운영자에게 알린다 — 사람이 하루 안에 처리한다.
 */
export async function deleteMyAccount(input: DeleteMyAccountInput): Promise<DeleteMyAccountResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 풀렸어요. 다시 로그인한 뒤 진행해 주세요.' }

  const reason = (input?.reason ?? '').trim()
  if (!(DELETE_REASONS as readonly string[]).includes(reason)) {
    return { ok: false, message: '떠나시는 이유를 하나 골라 주세요.' }
  }
  if ((input?.confirmEmail ?? '').trim().toLowerCase() !== (user.email ?? '').toLowerCase()) {
    return { ok: false, message: '가입하신 이메일과 다르게 적혔어요. 위에 보이는 이메일을 그대로 적어 주세요.' }
  }

  // 사유는 계정을 지우기 전에 남긴다(user_id 는 삭제 뒤 NULL 이 되고 글만 남는다). 실패해도 탈퇴는 막지 않는다.
  const detail = (input.detail ?? '').trim().slice(0, 200)
  await createAdminClient().from('feedback').insert({
    user_id: user.id,
    path: DELETE_REASON_PATH,
    message: detail ? `${reason} — ${detail}` : reason,
    resolved: true,
  }).then(({ error }) => {
    if (error) {
      console.error('[account] 탈퇴 사유 기록 실패 — 사유 없이 탈퇴 계속 진행', { code: error.code, message: error.message })
    }
  }, (error: unknown) => {
    console.error('[account] 탈퇴 사유 기록 예외 — 사유 없이 탈퇴 계속 진행', {
      code: 'exception', message: error instanceof Error ? error.message : String(error),
    })
  })

  // 서버 액션에서 던지면 사용자는 오류 화면(코드만 있는)을 본다 — 어떤 실패든 말로 돌려준다.
  const result = await deleteAccountKeepingPayments(user.id).catch((e: unknown) => ({
    ok: false as const, reason: 'ledger' as const, detail: e instanceof Error ? e.message : String(e),
  }))
  if (!result.ok) {
    await recordOperatorAlert(
      'feedback',
      `회원 탈퇴 실패(${result.reason}): ${result.detail} — 사람이 처리 필요 (user ${user.id.slice(0, 8)})`,
      user.id,
    ).catch(() => {})
    return {
      ok: false,
      message: '지금은 탈퇴 처리가 되지 않았어요. 운영자에게 자동으로 전달됐고, 하루 안에 처리해 드립니다. 급하시면 고객센터로 알려 주세요.',
    }
  }

  await supabase.auth.signOut()
  redirect('/account/deleted')
}
