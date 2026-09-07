'use client'

import { useState, useTransition } from 'react'
import { deleteMyAccount } from '@/app/(main)/account/actions'
import { DELETE_REASONS } from '@/lib/accountDeletionConstants'

// 탈퇴는 되돌릴 수 없으니 실수로 넘어가지 않게 세 번 멈춘다 — 사유 고르기, 본인 이메일 적기,
// 마지막 확인 창. 막는 게 아니라 '정말 원하는 사람만' 통과하게 하는 문턱이다(운영자 지시 2026-09-07
// "조금 하기 어렵게"). 사유는 남겨 두어 무엇이 사람을 떠나게 하는지 본다.
export default function DeleteAccountForm({ email }: { email: string }) {
  const [reason, setReason] = useState<string>('')
  const [detail, setDetail] = useState('')
  const [typed, setTyped] = useState('')
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const emailOk = typed.trim().toLowerCase() === email.toLowerCase()
  const ready = agree && !!reason && emailOk && !pending

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!ready) return
        // 마지막 문턱 — 브라우저 확인 창. 여기서 '취소'를 누르면 아무 일도 없다.
        if (!window.confirm('정말 탈퇴할까요?\n로그인 정보와 학습 기록이 지금 바로 지워지고 되돌릴 수 없습니다.')) return
        setError(null)
        start(async () => {
          // 성공하면 서버가 redirect 로 화면을 바꾼다 — 여기로 돌아오는 것은 실패뿐이다.
          const r = await deleteMyAccount({ confirmEmail: typed, reason, detail })
          if (r && !r.ok) setError(r.message)
        })
      }}
      className="space-y-4"
    >
      <fieldset>
        <legend className="text-sm font-semibold text-[#0f172a] mb-2">떠나시는 이유를 하나 골라 주세요 <span className="text-red-700">*</span></legend>
        <div className="space-y-1.5">
          {DELETE_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2.5 text-sm text-[#334155] cursor-pointer">
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4 accent-[#1e3a5f]" />
              {r}
            </label>
          ))}
        </div>
        {reason === '기타' && (
          <input
            type="text"
            value={detail}
            onChange={(e) => setDetail(e.target.value.slice(0, 200))}
            placeholder="어떤 점이었는지 한 줄만 적어 주세요(선택)"
            aria-label="탈퇴 사유 상세"
            className="mt-2 w-full rounded-xl border border-[#e2e8f0] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        )}
      </fieldset>

      <label className="flex items-start gap-2.5 text-sm text-[#334155] cursor-pointer">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-red-700" />
        <span>위 내용을 확인했고, 남은 이용권과 학습 기록이 사라지는 데 동의합니다.</span>
      </label>

      <label className="block text-sm text-[#334155]">
        본인 확인을 위해 가입 이메일 <b className="text-red-700">{email}</b> 을 그대로 적어 주세요
        <input
          type="email"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          placeholder={email}
          aria-label="탈퇴 확인 이메일"
          className="mt-1.5 w-full rounded-xl border border-[#e2e8f0] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
        />
      </label>

      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{error}</p>}
      <button
        type="submit"
        disabled={!ready}
        className="w-full min-h-[44px] rounded-xl bg-red-700 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-800 transition-colors"
      >
        {pending ? '처리 중…' : '탈퇴하기'}
      </button>
    </form>
  )
}
