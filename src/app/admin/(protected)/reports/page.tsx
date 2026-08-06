import { createAdminClient } from '@/lib/supabase/admin'
import ReportsClient, { type AdminReport } from './ReportsClient'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('question_reports')
    .select('id, question_id, reason, resolved, created_at')
    .order('resolved', { ascending: true })
    .order('created_at', { ascending: false })

  const qids = [...new Set((rows ?? []).map(r => r.question_id as string))]
  const { data: qrows } = qids.length
    ? await admin.from('questions').select('id, year, round, number, type, question').in('id', qids)
    : { data: [] }
  const qmap = new Map((qrows ?? []).map(q => [q.id as string, q]))

  const reports: AdminReport[] = (rows ?? []).map(r => {
    const q = qmap.get(r.question_id as string)
    return {
      id: r.id as string,
      reason: r.reason as string,
      resolved: !!r.resolved,
      createdAt: r.created_at as string,
      questionId: r.question_id as string,
      label: q ? `${q.year < 9000 ? `모의고사 ${q.round}회` : '유형별 연습'} ${q.number}번 (${q.type})` : '(삭제된 문항)',
      questionText: (q?.question as string | undefined) ?? '',
      editHref: q ? `/admin/questions/${r.question_id}/edit` : null,
    }
  })

  const pending = reports.filter(r => !r.resolved).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">문제 오류 신고</h1>
        <p className="text-sm text-gray-600 mt-1">총 {reports.length}건 · 미처리 <span className="font-semibold text-amber-700">{pending}</span>건</p>
      </div>
      <ReportsClient reports={reports} />
    </div>
  )
}
