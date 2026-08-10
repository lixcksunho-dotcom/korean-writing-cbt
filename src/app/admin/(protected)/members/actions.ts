'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// 서버 액션은 레이아웃 가드와 별개이므로 호출 시마다 관리자 권한을 재확인한다.
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user || !adminEmails.includes(user.email ?? '')) throw new Error('Forbidden')
}

/** 회원(아이디) 추가 — 이메일 인증 완료 상태로 즉시 생성 */
export async function createMember(email: string, password: string, name?: string) {
  await assertAdmin()
  if (!email.includes('@')) throw new Error('올바른 이메일을 입력하세요.')
  if ((password ?? '').length < 6) throw new Error('비밀번호는 6자 이상이어야 합니다.')
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: name ? { name: name.trim() } : undefined,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/members')
}

/**
 * 회원 삭제.
 *
 * subscriptions.user_id 가 ON DELETE CASCADE 라서, 그냥 지우면 **결제 기록도 함께
 * 사라진다** — 누적 매출이 조용히 줄고, 환불·분쟁 때 근거가 없어지며, 전자상거래법이
 * 요구하는 대금결제 기록 5년 보존과도 어긋난다(개인정보처리방침에도 "법령상 보존이
 * 필요한 경우 보관"이라고 적어 두었다).
 *
 * 그래서 지우기 전에 결제 기록과 사람의 연결을 먼저 끊는다. 거래가 있었다는 사실은
 * 남기고 '누가 샀는지'만 지우는 것이라 개인정보 관점에서도 이쪽이 맞다.
 *
 * 마이그레이션 036 적용 전에는 user_id 가 NOT NULL 이라 이 끊기가 실패한다. 그때는
 * 결제 기록이 있는 회원의 삭제를 막는다 — 조용히 지워 버리는 것보다 낫다.
 */
export async function deleteMember(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: paid } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (paid && paid.length > 0) {
    const { error: unlinkError } = await admin
      .from('subscriptions')
      .update({ user_id: null })
      .eq('user_id', userId)
    if (unlinkError) {
      throw new Error(
        '이 회원에게 결제 기록이 있어 지금 삭제하면 결제 기록도 함께 사라집니다. ' +
        'supabase/migrations/036_keep_payment_records.sql 을 먼저 실행해 주세요.'
      )
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/members')
}

/**
 * 유료(이용권) 상태 토글.
 * - paid=true  : 활성 이용권이 없으면 30일짜리 관리자 지급 이용권을 발급
 * - paid=false : 활성 이용권을 모두 해지(status=cancelled)
 */
export async function setMemberPaid(userId: string, paid: boolean) {
  await assertAdmin()
  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  if (paid) {
    const { data: existing } = await admin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('expires_at', nowIso)
      .limit(1)
      .maybeSingle()
    if (existing) return // 이미 활성 — 중복 발급 방지

    const expires = new Date()
    expires.setDate(expires.getDate() + 30)
    const stamp = Date.now()
    const { error } = await admin.from('subscriptions').insert({
      user_id: userId,
      payment_key: `admin-grant-${stamp}`,
      order_id: `admin-grant-${userId}-${stamp}`,
      amount: 0,
      status: 'active',
      expires_at: expires.toISOString(),
    })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await admin
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'active')
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/members')
  revalidatePath('/dashboard')
}
