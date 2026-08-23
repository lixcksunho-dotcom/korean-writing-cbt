import { createAdminClient } from '@/lib/supabase/admin'
import { MessageSquareWarning } from 'lucide-react'
import FeedbackClient, { type FeedbackRow } from './FeedbackClient'

export const dynamic = 'force-dynamic'

// 고객이 남긴 불편사항. 처리 안 한 것이 위로 온다.
export default async function AdminFeedbackPage() {
  const { data, error } = await createAdminClient()
    .from('feedback')
    .select('id, message, contact, path, resolved, created_at, user_id')
    .order('resolved', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (data ?? []) as FeedbackRow[]
  const pending = rows.filter((r) => !r.resolved).length

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <MessageSquareWarning className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-black text-gray-900">불편사항</h1>
        {pending > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">미처리 {pending}</span>
        )}
      </div>

      {/* 조회가 실패하면 '아직 없습니다'로 보인다 — 접수가 안 되는 것과 구분되지 않으므로 이유를 드러낸다. */}
      {error ? (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          불편사항을 불러오지 못했습니다: {error.message}
          <br />
          <span className="text-xs">feedback 테이블이 아직 없으면 supabase/migrations/037_feedback.sql을 대시보드에서 실행해 주세요.</span>
        </p>
      ) : (
        <FeedbackClient rows={rows} />
      )}
    </div>
  )
}
