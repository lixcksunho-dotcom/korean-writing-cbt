import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { PenLine, FlaskConical } from 'lucide-react'
import { BLOG_REVIEW_PATH } from '@/lib/blogPromoRules'
import ReviewClient, { type ReviewRow } from './ReviewClient'

export const dynamic = 'force-dynamic'

// 블로그 홍보 신청 심사. 미처리가 위로 온다.
// 접수는 feedback 표를 재사용한다(path로 불편사항과 갈린다) — 새 표가 없어도 오늘 돈다.
export default async function AdminPromoReviewsPage() {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('feedback')
    .select('id, user_id, contact, message, resolved, created_at')
    .eq('path', BLOG_REVIEW_PATH)
    .order('resolved', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  const base = data ?? []
  // 실제 지급 여부는 subscriptions로 확인한다 — '처리됨'과 '지급됨'은 다른 사건이다.
  const { data: grants } = base.length
    ? await admin
        .from('subscriptions')
        .select('order_id')
        .in('order_id', base.map(r => `review-${r.id}`))
    : { data: [] }
  const granted = new Set((grants ?? []).map(g => String(g.order_id)))

  const rows: ReviewRow[] = base.map(r => ({
    id: r.id,
    user_id: r.user_id,
    contact: r.contact,
    message: r.message,
    resolved: r.resolved,
    created_at: r.created_at,
    granted: granted.has(`review-${r.id}`),
  }))
  const pending = rows.filter(r => !r.resolved).length

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <PenLine className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-black text-gray-900">블로그 홍보 심사</h1>
        {pending > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">미처리 {pending}</span>
        )}
        <Link
          href="/admin/promo-reviews/test"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-bold text-[#334155] hover:bg-[#f8fafc]"
        >
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          판정 실험실
        </Link>
      </div>

      <p className="mb-5 rounded-xl border border-[#e2e8f0] bg-white p-4 text-sm text-gray-600">
        승인을 누르면 <b>그 자리에서 이용권 30일이 지급</b>됩니다(무료 발급 0원, 매출에 안 섞임).
        같은 신청으로 두 번 지급되지 않습니다 — <code className="rounded bg-gray-100 px-1 text-xs">order_id</code>의
        unique 제약이 막습니다. 자동 확인은 거들 뿐이라 <b>네이버·티스토리는 못 읽는 경우가 흔합니다</b>.
        그때는 글을 직접 열어 보고 판단해 주세요.
      </p>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          신청을 불러오지 못했습니다: {error.message}
        </p>
      ) : (
        <ReviewClient rows={rows} />
      )}
    </div>
  )
}
