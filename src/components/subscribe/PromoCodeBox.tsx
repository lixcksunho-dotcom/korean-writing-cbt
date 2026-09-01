'use client'

import { useState, useTransition } from 'react'
import { Gift, CheckCircle2, AlertCircle } from 'lucide-react'
import { redeemPromoCode } from '@/app/(main)/subscribe/promo-actions'

// 행사 코드 입력칸 — 블로그 홍보에 참여한 분이 받은 코드를 이용권으로 바꾼다.
// 결제창 옆에 둔다: 코드를 가진 사람은 결제하러 왔다가 여기서 멈춰야 한다.
export default function PromoCodeBox() {
  const [code, setCode] = useState('')
  const [done, setDone] = useState<{ days: number; expiresAt: string; extended: boolean } | null>(null)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    start(async () => {
      const r = await redeemPromoCode(code)
      if (r.ok) { setDone({ days: r.days, expiresAt: r.expiresAt, extended: r.extended }); setCode('') }
      else setError(r.message)
    })
  }

  if (done) {
    return (
      <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-900">
            이용권 {done.days}일이 {done.extended ? '기존 기간 뒤에 더해졌어요' : '지급됐어요'}
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            {new Date(done.expiresAt).toLocaleDateString('ko-KR')}까지 전 회차와 영역별 약점 분석을 쓰실 수 있어요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Gift className="h-4 w-4 text-[#d97706]" aria-hidden="true" />
        <h3 className="text-sm font-bold text-[#0f172a]">행사 코드가 있으신가요?</h3>
      </div>
      <p className="text-xs text-[#64748b] mb-3">블로그 후기 이벤트 등으로 받은 코드를 넣으면 이용권이 바로 지급돼요.</p>

      <div className="flex gap-2">
        <label htmlFor="promo-code" className="sr-only">행사 코드</label>
        <input
          id="promo-code"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="예: BLOG30"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] uppercase tracking-wider focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="btn-gold shrink-0 px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {pending ? '확인 중…' : '적용'}
        </button>
      </div>

      {error && (
        <p className="mt-2.5 flex items-start gap-1.5 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </form>
  )
}
