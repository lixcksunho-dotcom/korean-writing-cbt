import { createAdminClient } from '@/lib/supabase/admin'
import { isActivePass } from '@/lib/subscription'
import { memberRefundStatus } from '@/lib/memberRefundStatus'
import { NO_PAYMENT } from '@/lib/refundEligibility'
import { ADMIN_PAGE_SIZE, fetchAllRows, listAllUsers, listUsersPage, parsePage } from '@/lib/adminPaging'
import type { User } from '@supabase/supabase-js'
import MembersClient, { type AdminMember } from './MembersClient'
import AdminPager from '../AdminPager'

export const dynamic = 'force-dynamic'

type SubRow = { user_id: string; status: string; expires_at: string; started_at: string | null }

function matches(u: User, k: string) {
  const name = ((u.user_metadata?.name as string | undefined) ?? '').toLowerCase()
  return (u.email ?? '').toLowerCase().includes(k) || name.includes(k)
}

/**
 * 한 페이지의 회원. 검색어가 있으면 전원을 100명씩 끝까지 읽어 거른 뒤 그 결과를 쪽으로 나눈다 —
 * GoTrue 목록 API 에는 이름 검색이 없고, 한 쪽 안에서만 찾으면 다른 쪽의 회원을 못 찾는다.
 * 주소의 page 가 범위를 넘으면(회원이 줄었거나 손으로 적은 값) 마지막 쪽을 준다.
 */
async function loadMembersPage(admin: ReturnType<typeof createAdminClient>, wanted: number, q: string) {
  if (!q) {
    let r = await listUsersPage(admin, wanted)
    if (r.users.length === 0 && wanted > r.lastPage) r = await listUsersPage(admin, r.lastPage)
    return { ...r, page: Math.min(wanted, r.lastPage), allTotal: r.total }
  }
  const all = await listAllUsers(admin)
  const hits = all.filter(u => matches(u, q))
  const lastPage = Math.max(1, Math.ceil(hits.length / ADMIN_PAGE_SIZE))
  const page = Math.min(wanted, lastPage)
  return {
    users: hits.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE),
    total: hits.length,
    lastPage,
    page,
    allTotal: all.length,
  }
}

/** 유료 회원 총원 — 이 쪽만 세면 숫자가 줄어든다. 활성 이용권을 가진 사람을 전체에서 센다. */
async function countPaidMembers(admin: ReturnType<typeof createAdminClient>) {
  const nowIso = new Date().toISOString()
  const rows = await fetchAllRows<{ user_id: string }>((from, to) =>
    admin.from('subscriptions').select('user_id').eq('status', 'active').gte('expires_at', nowIso)
      .order('user_id', { ascending: true }).range(from, to),
  )
  return new Set(rows.map(r => r.user_id)).size
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  // 관리자 권한은 admin/layout.tsx에서 검증됨.
  const sp = await searchParams
  const q = (sp.q ?? '').trim().toLowerCase()
  const admin = createAdminClient()

  const [{ users, total, page, allTotal }, paidTotal] = await Promise.all([
    loadMembersPage(admin, parsePage(sp.page), q),
    countPaidMembers(admin),
  ])

  // 이 쪽의 회원 것만 읽는다 — 이용권·환불 판정은 화면에 보이는 사람에게만 필요하다.
  const ids = users.map(u => u.id)
  const { data: subs } = ids.length
    ? await admin.from('subscriptions').select('user_id, status, expires_at, started_at').in('user_id', ids)
    : { data: [] as SubRow[] }
  const pageSubs = (subs ?? []) as SubRow[]

  const paidSet = new Set(pageSubs.filter(s => isActivePass(s.status, s.expires_at)).map(s => s.user_id))

  // 환불 문의가 왔을 때 정책 기준(7일 · 미사용)을 화면에서 바로 확인하기 위한 것
  const refunds = await memberRefundStatus(pageSubs.map(s => ({ user_id: s.user_id, started_at: s.started_at })))

  const members: AdminMember[] = users.map(u => ({
    id: u.id,
    email: u.email ?? '(이메일 없음)',
    name: (u.user_metadata?.name as string | undefined) ?? '',
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    provider: (u.app_metadata?.provider as string | undefined) ?? 'email',
    paid: paidSet.has(u.id),
    refund: refunds.get(u.id) ?? NO_PAYMENT,
  }))

  // 최신 가입순(쪽 안에서)
  members.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const href = (p: number) => `/admin/members?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">회원 관리</h1>
        <p className="text-sm text-gray-600 mt-1">
          전체 <span className="font-semibold text-gray-900">{allTotal}</span>명 · 유료{' '}
          <span className="font-semibold text-emerald-700">{paidTotal}</span>명
          {q && <> · &lsquo;{sp.q?.trim()}&rsquo; 검색 결과 <span className="font-semibold text-gray-900">{total}</span>명</>}
        </p>
      </div>
      <MembersClient members={members} q={q} />
      <AdminPager page={page} pageSize={ADMIN_PAGE_SIZE} total={total} href={href} label="명" />
    </div>
  )
}
