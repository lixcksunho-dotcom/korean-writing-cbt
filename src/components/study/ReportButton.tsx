'use client'

import { useState, useTransition } from 'react'
import { Flag, Check, X } from 'lucide-react'
import { submitQuestionReport } from '@/lib/study-actions'

const REASONS = ['정답이 틀린 것 같아요', '문제·보기에 오타가 있어요', '해설이 이상해요', '기타 오류']

export default function ReportButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [custom, setCustom] = useState('')
  const [pending, start] = useTransition()
  const [err, setErr] = useState('')

  function send(reason: string) {
    setErr('')
    start(async () => {
      try { await submitQuestionReport(questionId, reason); setDone(true); setOpen(false) }
      catch (e) { setErr(e instanceof Error ? e.message : '신고 실패') }
    })
  }

  if (done) {
    return <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold px-2 py-1"><Check className="h-3.5 w-3.5" /> 신고 접수됨</span>
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
      >
        <Flag className="h-3.5 w-3.5" /> 오류 신고
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 bg-white border border-[#e2e8f0] rounded-xl shadow-lg p-2">
          <div className="flex items-center justify-between px-1.5 pb-1.5 mb-1 border-b border-[#f1f5f9]">
            <span className="text-xs font-bold text-[#334155]">무엇이 잘못됐나요?</span>
            <button onClick={() => setOpen(false)} className="text-[#64748b] hover:text-[#64748b]"><X className="h-3.5 w-3.5" /></button>
          </div>
          {REASONS.map(r => (
            <button key={r} disabled={pending} onClick={() => send(r)}
              className="w-full text-left text-xs text-[#475569] px-2 py-1.5 rounded-lg hover:bg-[#f8fafc] disabled:opacity-50">
              {r}
            </button>
          ))}
          <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-[#f1f5f9]">
            <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="직접 입력(선택)"
              className="flex-1 min-w-0 text-xs border border-[#e2e8f0] rounded-lg px-2 py-1 focus:outline-none focus:border-[#1e3a5f]" />
            <button disabled={pending || !custom.trim()} onClick={() => send(custom)}
              className="text-xs font-bold text-white bg-[#1e3a5f] px-2.5 rounded-lg disabled:opacity-40">전송</button>
          </div>
          {err && <p className="text-xs text-red-600 px-1.5 pt-1">{err}</p>}
        </div>
      )}
    </div>
  )
}
