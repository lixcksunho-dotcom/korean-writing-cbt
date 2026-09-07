'use client'

import { useState, useTransition } from 'react'
import { deleteMyAccount } from '@/app/(main)/account/actions'
import { DELETE_CONFIRM_WORD } from '@/lib/accountDeletionConstants'

// 탈퇴 버튼은 두 번 묻지 않는다. 대신 낱말 하나를 직접 적게 한다 — 실수로 눌러 지워지는 것과
// '정말요?' 창을 무심코 넘기는 것, 둘 다 막는 가장 짧은 방법이다.
export default function DeleteAccountForm() {
  const [confirm, setConfirm] = useState('')
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const ready = agree && confirm.trim() === DELETE_CONFIRM_WORD && !pending

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!ready) return
        setError(null)
        start(async () => {
          // 성공하면 서버가 redirect 로 화면을 바꾼다 — 여기로 돌아오는 것은 실패뿐이다.
          const r = await deleteMyAccount(confirm)
          if (r && !r.ok) setError(r.message)
        })
      }}
      className="space-y-3"
    >
      <label className="flex items-start gap-2.5 text-sm text-[#334155] cursor-pointer">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-red-700" />
        <span>위 내용을 확인했고, 남은 이용권과 학습 기록이 사라지는 데 동의합니다.</span>
      </label>
      <label className="block text-sm text-[#334155]">
        확인을 위해 <b className="text-red-700">{DELETE_CONFIRM_WORD}</b> 두 글자를 적어 주세요
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          placeholder={DELETE_CONFIRM_WORD}
          aria-label="탈퇴 확인 낱말"
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
