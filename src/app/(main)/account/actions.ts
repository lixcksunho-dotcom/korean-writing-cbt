'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deleteAccountKeepingPayments, DELETE_CONFIRM_WORD } from '@/lib/accountDeletion'
import { recordOperatorAlert } from '@/lib/operatorAlerts'

export type DeleteMyAccountResult = { ok: false; message: string }

/**
 * 본인 탈퇴. 확인 낱말을 정확히 적어야 한다.
 *
 * 성공하면 세션을 끊고 완료 화면으로 보낸다(redirect 는 throw 라 반환값이 없다).
 * 결제 기록 보관에 실패하면 지우지 않고 운영자에게 알린다 — 사람이 하루 안에 처리한다.
 */
export async function deleteMyAccount(confirm: string): Promise<DeleteMyAccountResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 풀렸어요. 다시 로그인한 뒤 진행해 주세요.' }
  if ((confirm ?? '').trim() !== DELETE_CONFIRM_WORD) {
    return { ok: false, message: `확인 칸에 "${DELETE_CONFIRM_WORD}" 두 글자를 정확히 적어 주세요.` }
  }

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
