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

/** 회원 삭제 */
export async function deleteMember(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()
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
