'use client'

import { useState } from 'react'
import { MessageSquareWarning, Check } from 'lucide-react'
import { MAX_LENGTH } from '@/lib/feedbackMessage'
import { trackEvent } from '@/lib/analytics/trackEvent'

// 불편사항 접수 폼. 로그인하지 않아도 보낼 수 있다 — 결제 전에 막힌 사람이 가장 할 말이 많다.
// 연락처는 선택이다. 답을 받을 생각이 없어도 말은 남길 수 있어야 한다.

export default function FeedbackForm({ email }: { email: string }) {
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function send() {
    if (state === 'sending') return
    setState('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, contact, path: window.location.pathname }),
      })
      // 서버가 실패를 알려 주는데 화면이 '보냈습니다'라고 하면 그 말은 영영 사라진다.
      if (!res.ok) { setState('error'); return }
      setState('done')
      setMessage(''); setContact('')
      trackEvent('feedback_sent')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
          <Check className="h-4 w-4" /> 접수됐습니다. 알려 주셔서 고맙습니다.
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          연락처를 남기셨으면 확인 후 답변드릴게요.
        </p>
        <button
          onClick={() => setState('idle')}
          className="mt-3 min-h-11 text-xs font-semibold text-emerald-800 underline"
        >
          하나 더 알려주기
        </button>
      </div>
    )
  }

  const tooShort = message.trim().length < 2

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
      <h2 className="mb-1 flex items-center gap-2 text-base font-black text-[#0f172a]">
        <MessageSquareWarning className="h-4 w-4 text-amber-500" />
        불편한 점을 알려주세요
      </h2>
      <p className="mb-3 text-xs text-[#64748b]">
        로그인하지 않아도 보낼 수 있어요. 짧아도 괜찮습니다 — &ldquo;느려요&rdquo; 한마디도 도움이 됩니다.
      </p>

      <label htmlFor="feedback-message" className="sr-only">불편한 점</label>
      <textarea
        id="feedback-message"
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
        rows={4}
        placeholder="어떤 화면에서 무엇이 불편하셨나요?"
        className="w-full rounded-xl border border-[#e2e8f0] px-3.5 py-3 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
      />

      <label htmlFor="feedback-contact" className="mt-3 block text-xs font-semibold text-[#475569]">
        연락처 <span className="font-normal text-[#64748b]">(선택 — 답변이 필요할 때만)</span>
      </label>
      <input
        id="feedback-contact"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="이메일 또는 연락 가능한 곳"
        className="mt-1 w-full rounded-xl border border-[#e2e8f0] px-3.5 py-3 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
      />

      <button
        onClick={send}
        disabled={state === 'sending' || tooShort}
        className="mt-3 min-h-11 w-full rounded-xl bg-[#1e3a5f] py-3 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
      >
        {state === 'sending' ? '보내는 중…' : '보내기'}
      </button>

      {state === 'error' && (
        <p className="mt-2 text-xs text-red-600">
          접수가 안 됐어요. 번거로우시겠지만{' '}
          <a href={`mailto:${email}`} className="font-semibold underline">{email}</a>
          로 보내주시면 확인하겠습니다.
        </p>
      )}
    </div>
  )
}
