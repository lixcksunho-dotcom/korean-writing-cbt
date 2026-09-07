'use client'

import { useState, useTransition } from 'react'
import { setFeedbackResolved } from './actions'

export type FeedbackRow = {
  id: string
  message: string
  contact: string | null
  path: string | null
  resolved: boolean
  created_at: string
  user_id: string | null
  /** 운영자가 남긴 답글(있으면). 회원 화면의 해결 띠에 실린다. */
  reply?: string | null
}

function ResolveControls({ row }: { row: FeedbackRow }) {
  const [pending, start] = useTransition()
  const [reply, setReply] = useState(row.reply ?? '')
  const [open, setOpen] = useState(false)

  if (row.resolved) {
    return (
      <button
        disabled={pending}
        onClick={() => start(() => setFeedbackResolved(row.id, false).then(() => {}))}
        className="shrink-0 rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-50 bg-gray-200 text-gray-700"
      >
        {pending ? '…' : '되돌리기'}
      </button>
    )
  }
  return (
    <div className="shrink-0 flex flex-col items-end gap-1.5">
      {!open ? (
        <button onClick={() => setOpen(true)} className="rounded-md px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700">
          처리함
        </button>
      ) : (
        <>
          {/* 답글은 회원에게만 닿는다(띠는 로그인한 본인 화면에만 뜬다). 비회원이면 연락처로 직접 답한다. */}
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value.slice(0, 500))}
            placeholder={row.user_id ? '그 사람 화면의 해결 띠에 실릴 답글(선택). 예: 로그인 후 오른쪽 위 [계정]에서 탈퇴할 수 있어요.' : '비회원이라 띠가 안 갑니다 — 연락처로 직접 답해 주세요'}
            rows={3}
            className="w-64 rounded-md border border-[#e2e8f0] px-2.5 py-1.5 text-xs"
          />
          <div className="flex gap-1.5">
            <button onClick={() => setOpen(false)} className="rounded-md px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-600">취소</button>
            <button
              disabled={pending}
              onClick={() => start(() => setFeedbackResolved(row.id, true, reply).then(() => setOpen(false)))}
              className="rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {pending ? '…' : reply.trim() ? '답글과 함께 처리함' : '답글 없이 처리함'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function FeedbackClient({ rows, ackAt = {} }: { rows: FeedbackRow[]; ackAt?: Record<string, string> }) {
  if (rows.length === 0) {
    return <p className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-gray-600">아직 접수된 불편사항이 없습니다.</p>
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className={`rounded-xl border p-4 ${r.resolved ? 'border-[#e2e8f0] bg-gray-50' : 'border-amber-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-3">
            <p className={`whitespace-pre-wrap text-sm ${r.resolved ? 'text-gray-500' : 'text-gray-900'}`}>{r.message}</p>
            <ResolveControls row={r} />
          </div>
          {r.resolved && r.reply && (
            <p className="mt-2 whitespace-pre-wrap rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900">답글: {r.reply}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>{new Date(r.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
            {r.path && <span>화면 {r.path}</span>}
            {r.contact && <span className="font-semibold text-[#1e3a5f]">연락처 {r.contact}</span>}
            <span>{r.user_id ? '회원' : '비회원'}</span>
            {/* 처리함이 전달됐는지 — 회원이 아니면 알림 띠 자체가 안 가므로 표시하지 않는다 */}
            {r.resolved && r.user_id && (
              ackAt[r.id] ? (
                <span className="font-bold text-emerald-700">
                  ✓ 고객 확인함 · {new Date(ackAt[r.id]).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              ) : (
                <span className="font-semibold text-amber-700">고객 확인 전</span>
              )
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
