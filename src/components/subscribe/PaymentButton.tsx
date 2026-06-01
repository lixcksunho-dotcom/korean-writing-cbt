'use client'

import { useState } from 'react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'

type Method = 'card' | 'kakaopay' | 'tosspay'

const METHODS: { key: Method; label: string; emoji: string; color: string }[] = [
  { key: 'card', label: '카드 결제', emoji: '💳', color: 'border-[#1e3a5f] bg-[#1e3a5f] text-white' },
  { key: 'kakaopay', label: '카카오페이', emoji: '💛', color: 'border-[#FEE500] bg-[#FEE500] text-[#3C1E1E]' },
  { key: 'tosspay', label: '토스페이', emoji: '💙', color: 'border-[#0064FF] bg-[#0064FF] text-white' },
]

// 토스 SDK는 method에 영문 enum('CARD' 등)만 받음.
// 카카오페이/토스페이는 카드 결제의 간편결제 자체창(easyPay 코드)으로 연다.
function tossMethodParams(method: Method): Record<string, unknown> {
  switch (method) {
    case 'kakaopay':
      return { method: 'CARD', card: { flowMode: 'DIRECT', easyPay: 'KAKAOPAY' } }
    case 'tosspay':
      return { method: 'CARD', card: { flowMode: 'DIRECT', easyPay: 'TOSSPAY' } }
    default:
      return { method: 'CARD' }
  }
}

export default function PaymentButton({
  userId,
  userEmail,
  userName,
}: {
  userId: string
  userEmail: string
  userName: string
}) {
  const [loading, setLoading] = useState<Method | null>(null)
  const [error, setError] = useState('')

  async function handlePayment(method: Method) {
    setError('')
    setLoading(method)
    try {
      const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
      const payment = toss.payment({ customerKey: userId })

      const orderId = `sub_${crypto.randomUUID()}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (payment.requestPayment as (req: any) => Promise<void>)({
        ...tossMethodParams(method),
        amount: { currency: 'KRW', value: 5000 },
        orderId,
        orderName: 'AI 원고지 채점 1개월',
        customerEmail: userEmail,
        customerName: userName,
        successUrl: `${window.location.origin}/subscribe/success`,
        failUrl: `${window.location.origin}/subscribe/fail`,
      })
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (err?.code !== 'USER_CANCEL') {
        setError(err?.message ?? '결제 중 오류가 발생했습니다.')
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      {METHODS.map(({ key, label, emoji, color }) => (
        <button
          key={key}
          onClick={() => handlePayment(key)}
          disabled={loading !== null}
          className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm border-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg ${color}`}
        >
          <span className="text-base">{emoji}</span>
          {loading === key ? '결제창 열리는 중...' : label}
        </button>
      ))}

      {error && (
        <p className="text-xs text-red-500 text-center pt-1">{error}</p>
      )}

      <p className="text-center text-xs text-[#94a3b8] pt-1">
        결제 후 즉시 30일 이용권이 활성화됩니다
      </p>
    </div>
  )
}
