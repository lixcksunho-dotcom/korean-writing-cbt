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

// 답글은 처리 전·후 언제든 쓰고 고칠 수 있다. 저장하면 그 문의는 '처리함'이 된다 —
// 답을 했는데 미처리로 남는 상태는 없다. 회원(user_id)이면 다음 로그인 때 해결 띠에 답글이 뜨고,
// 비회원이면 띠가 갈 곳이 없으니 연락처로 직접 답하라고 알린다.
function ReplyBox({ row, onDone }: { row: FeedbackRow; onDone: () => void }) {
  const [pending, start] = useTransition()
  const [reply, setReply] = useState(row.reply ?? '')
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="mt-2 rounded-md border border-[#e2e8f0] bg-white p-3">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value.slice(0, 500))}
        placeholder="그 사람 화면의 해결 띠에 실릴 답글. 예: 로그인 후 오른쪽 위 [계정]에서 탈퇴할 수 있어요. https://kptest.cloud/account"
        rows={4}
        autoFocus
        className="w-full rounded-md border border-[#e2e8f0] px-2.5 py-2 text-sm"
      />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-gray-500">
          {row.user_id ? '회원 — 다음 로그인 때 첫 화면 띠로 전달됩니다. 주소는 링크로 눌립니다.' : '비회원 — 띠가 갈 곳이 없어 저장만 됩니다. 연락처로 직접 답해 주세요.'}
          {' '}{reply.length}/500
        </span>
        <div className="flex gap-1.5">
          <button onClick={onDone} className="rounded-md px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-600">취소</button>
          <button
            disabled={pending || !reply.trim()}
            onClick={() => {
              setError(null)
              start(() => setFeedbackResolved(row.id, true, reply).then(onDone).catch((e) => setError(String(e?.message ?? e))))
            }}
            className="rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {pending ? '저장 중…' : row.resolved ? '답글 저장' : '답글 저장하고 처리함'}
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">저장 실패: {error}</p>}
    </div>
  )
}

function Controls({ row, onReply }: { row: FeedbackRow; onReply: () => void }) {
  const [pending, start] = useTransition()
  return (
    <div className="shrink-0 flex gap-1.5">
      <button onClick={onReply} className="rounded-md px-2.5 py-1 text-xs font-bold bg-[#1e3a5f] text-white hover:bg-[#162d4a]">
        {row.reply ? '답글 고치기' : '답글 쓰기'}
      </button>
      {row.resolved ? (
        <button
          disabled={pending}
          onClick={() => start(() => setFeedbackResolved(row.id, false).then(() => {}))}
          className="rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-50 bg-gray-200 text-gray-700"
        >
          {pending ? '…' : '되돌리기'}
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={() => start(() => setFeedbackResolved(row.id, true).then(() => {}))}
          className="rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {pending ? '…' : '답글 없이 처리함'}
        </button>
      )}
    </div>
  )
}

export default function FeedbackClient({ rows, ackAt = {} }: { rows: FeedbackRow[]; ackAt?: Record<string, string> }) {
  const [editing, setEditing] = useState<string | null>(null)
  if (rows.length === 0) {
    return <p className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-gray-600">아직 접수된 불편사항이 없습니다.</p>
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className={`rounded-xl border p-4 ${r.resolved ? 'border-[#e2e8f0] bg-gray-50' : 'border-amber-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-3">
            <p className={`whitespace-pre-wrap text-sm ${r.resolved ? 'text-gray-500' : 'text-gray-900'}`}>{r.message}</p>
            <Controls row={r} onReply={() => setEditing(editing === r.id ? null : r.id)} />
          </div>
          {editing === r.id ? (
            <ReplyBox row={r} onDone={() => setEditing(null)} />
          ) : (
            r.reply && <p className="mt-2 whitespace-pre-wrap rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900">답글: {r.reply}</p>
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
