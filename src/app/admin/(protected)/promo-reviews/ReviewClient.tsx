'use client'

import { useState, useTransition } from 'react'
import { approveBlogReview, rejectBlogReview } from './actions'

export type ReviewRow = {
  id: string
  user_id: string | null
  contact: string | null
  message: string
  resolved: boolean
  created_at: string
  /** 이 신청으로 이미 지급됐는지 (order_id = review-<id>) */
  granted: boolean
}

function Actions({ row }: { row: ReviewRow }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  if (row.resolved) {
    return <span className="text-xs font-bold text-gray-500">{row.granted ? '승인 · 지급 완료' : '처리됨'}</span>
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => start(async () => {
            const r = await approveBlogReview(row.id)
            setMsg(r.ok ? `지급 완료 (${new Date(r.expiresAt).toLocaleDateString('ko-KR')}까지)` : r.message)
          })}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? '…' : '승인 · 이용권 지급'}
        </button>
        <button
          disabled={pending}
          onClick={() => start(async () => { await rejectBlogReview(row.id); setMsg('반려 처리') })}
          className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          반려
        </button>
      </div>
      {msg && <span className="text-xs text-gray-600">{msg}</span>}
    </div>
  )
}

export default function ReviewClient({ rows }: { rows: ReviewRow[] }) {
  if (rows.length === 0) {
    return <p className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-gray-600">아직 신청이 없습니다.</p>
  }
  return (
    <ul className="space-y-3">
      {rows.map(r => (
        <li key={r.id} className={`rounded-xl border p-4 ${r.resolved ? 'border-[#e2e8f0] bg-gray-50' : 'border-amber-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {r.contact && (
                <a
                  href={r.contact}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="block truncate text-sm font-bold text-[#1e3a5f] underline underline-offset-2"
                >
                  {r.contact}
                </a>
              )}
              {/* 자동 확인 결과를 그대로 보여 준다 — 관리자가 글을 열기 전에 무엇이 걸렸는지 안다 */}
              <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-gray-600">{r.message}</pre>
            </div>
            <Actions row={r} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-gray-500">
            <span>{new Date(r.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
            <span className="font-mono">{String(r.user_id ?? '비회원').slice(0, 8)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
