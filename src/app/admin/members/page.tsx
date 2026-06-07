import { createAdminClient } from '@/lib/supabase/admin'
import MembersClient, { type AdminMember } from './MembersClient'

export const dynamic = 'force-dynamic'

export default async function AdminMembersPage() {
  // 관리자 권한은 admin/layout.tsx에서 검증됨.
  const admin = createAdminClient()

  // 회원 목록(Auth) + 활성 이용권 매핑
  const [{ data: list }, { data: subs }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from('subscriptions').select('user_id, status, expires_at'),
  ])

  const now = Date.now()
  const paidSet = new Set(
    (subs ?? [])
      .filter(s => s.status === 'active' && new Date(s.expires_at as string).getTime() >= now)
      .map(s => s.user_id as string)
  )

  const members: AdminMember[] = (list?.users ?? []).map(u => ({
    id: u.id,
    email: u.email ?? '(이메일 없음)',
    name: (u.user_metadata?.name as string | undefined) ?? '',
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    provider: (u.app_metadata?.provider as string | undefined) ?? 'email',
    paid: paidSet.has(u.id),
  }))

  // 최신 가입순
  members.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">회원 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          총 {members.length}명 · 유료 <span className="font-semibold text-emerald-600">{members.filter(m => m.paid).length}</span>명
        </p>
      </div>
      <MembersClient members={members} />
    </div>
  )
}
