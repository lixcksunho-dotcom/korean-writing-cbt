'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, Undo2, Trash2, Pencil, Loader2 } from 'lucide-react'
import { setReportResolved, deleteReport } from './actions'

export type AdminReport = {
  id: string
  reason: string
  resolved: boolean
  createdAt: string
  questionId: string
  label: string
  questionText: string
  editHref: string | null
}

export default function ReportsClient({ reports }: { reports: AdminReport[] }) {
  if (reports.length === 0) {
    return <p className="text-sm text-gray-600 bg-white border rounded-xl p-8 text-center">접수된 신고가 없습니다.</p>
  }
  return <div className="space-y-3">{reports.map(r => <Row key={r.id} r={r} />)}</div>
}

function Row({ r }: { r: AdminReport }) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState('')

  function run(fn: () => Promise<void>) {
    setErr('')
    start(async () => { try { await fn() } catch (e) { setErr(e instanceof Error ? e.message : '오류') } })
  }

  return (
    <div className={`bg-white border rounded-xl p-4 ${r.resolved ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-xs font-bold text-gray-800">{r.label}</span>
        {r.resolved
          ? <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">처리됨</span>
          : <span className="text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">미처리</span>}
        <span className="text-xs text-gray-600 ml-auto">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</span>
      </div>
      {r.questionText && <p className="text-xs text-gray-600 line-clamp-2 mb-1.5">{r.questionText}</p>}
      <p className="text-sm text-gray-800 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">🚩 {r.reason}</p>
      <div className="flex items-center gap-2">
        <button onClick={() => run(() => setReportResolved(r.id, !r.resolved))} disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.resolved ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          {r.resolved ? '미처리로' : '처리 완료'}
        </button>
        {r.editHref && (
          <Link href={r.editHref} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200">
            <Pencil className="h-3.5 w-3.5" /> 문제 수정
          </Link>
        )}
        <button onClick={() => run(() => deleteReport(r.id))} disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40 ml-auto">
          <Trash2 className="h-3.5 w-3.5" /> 삭제
        </button>
      </div>
      {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
    </div>
  )
}
