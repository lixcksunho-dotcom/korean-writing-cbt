import { createAdminClient } from '@/lib/supabase/admin'
import { isActivePass } from '@/lib/subscription'
import { memberRefundStatus } from '@/lib/memberRefundStatus'
import { NO_PAYMENT } from '@/lib/refundEligibility'
import MembersClient, { type AdminMember } from './MembersClient'

export const dynamic = 'force-dynamic'

export default async function AdminMembersPage() {
  // 관리자 권한은 admin/layout.tsx에서 검증됨.
  const admin = createAdminClient()

  // 회원 목록(Auth) + 이용권
  const [{ data: list }, { data: subs }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from('subscriptions').select('user_id, status, expires_at, started_at'),
  ])

  const paidSet = new Set(
    (subs ?? [])
      .filter(s => isActivePass(s.status as string, s.expires_at as string))
      .map(s => s.user_id as string)
  )

  // 환불 문의가 왔을 때 정책 기준(7일 · 미사용)을 화면에서 바로 확인하기 위한 것
  const refunds = await memberRefundStatus(
    (subs ?? []).map(s => ({ user_id: s.user_id as string, started_at: (s.started_at as string | null) ?? null }))
  )

  const members: AdminMember[] = (list?.users ?? []).map(u => ({
    id: u.id,
    email: u.email ?? '(이메일 없음)',
    name: (u.user_metadata?.name as string | undefined) ?? '',
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    provider: (u.app_metadata?.provider as string | undefined) ?? 'email',
    paid: paidSet.has(u.id),
    refund: refunds.get(u.id) ?? NO_PAYMENT,
  }))

  // 최신 가입순
  members.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">회원 관리</h1>
        <p className="text-sm text-gray-600 mt-1">
          총 {members.length}명 · 유료 <span className="font-semibold text-emerald-700">{members.filter(m => m.paid).length}</span>명
        </p>
      </div>
      <MembersClient members={members} />
    </div>
  )
}
