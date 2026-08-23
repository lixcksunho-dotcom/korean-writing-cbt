'use client'

import { useTransition } from 'react'
import { setFeedbackResolved } from './actions'

export type FeedbackRow = {
  id: string
  message: string
  contact: string | null
  path: string | null
  resolved: boolean
  created_at: string
  user_id: string | null
}

function ResolveButton({ row }: { row: FeedbackRow }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => start(() => setFeedbackResolved(row.id, !row.resolved).then(() => {}))}
      className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-50 ${
        row.resolved ? 'bg-gray-200 text-gray-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
      }`}
    >
      {pending ? '…' : row.resolved ? '되돌리기' : '처리함'}
    </button>
  )
}

export default function FeedbackClient({ rows }: { rows: FeedbackRow[] }) {
  if (rows.length === 0) {
    return <p className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-gray-600">아직 접수된 불편사항이 없습니다.</p>
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className={`rounded-xl border p-4 ${r.resolved ? 'border-[#e2e8f0] bg-gray-50' : 'border-amber-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-3">
            <p className={`whitespace-pre-wrap text-sm ${r.resolved ? 'text-gray-500' : 'text-gray-900'}`}>{r.message}</p>
            <ResolveButton row={r} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>{new Date(r.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
            {r.path && <span>화면 {r.path}</span>}
            {r.contact && <span className="font-semibold text-[#1e3a5f]">연락처 {r.contact}</span>}
            <span>{r.user_id ? '회원' : '비회원'}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
