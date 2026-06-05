'use client'

import { useState } from 'react'
import * as PortOne from '@portone/browser-sdk/v2'

type Method = 'card' | 'kakaopay' | 'tosspay'

const METHODS: { key: Method; label: string; emoji: string; color: string }[] = [
  { key: 'card', label: '카드 결제', emoji: '💳', color: 'border-[#1e3a5f] bg-[#1e3a5f] text-white' },
  { key: 'kakaopay', label: '카카오페이', emoji: '💛', color: 'border-[#FEE500] bg-[#FEE500] text-[#3C1E1E]' },
  { key: 'tosspay', label: '토스페이', emoji: '💙', color: 'border-[#0064FF] bg-[#0064FF] text-white' },
]

// 포트원 V2 결제수단 매핑.
// 카드: payMethod 'CARD'. 간편결제(카카오페이/토스페이)는 'EASY_PAY' + easyPayProvider 코드.
// as const 로 리터럴 타입을 확정해야 PaymentRequest 판별 유니온에 맞는다.
function portoneMethodParams(method: Method) {
  switch (method) {
    case 'kakaopay':
      return { payMethod: 'EASY_PAY', easyPay: { easyPayProvider: 'EASY_PAY_PROVIDER_KAKAOPAY' } } as const
    case 'tosspay':
      return { payMethod: 'EASY_PAY', easyPay: { easyPayProvider: 'EASY_PAY_PROVIDER_TOSSPAY' } } as const
    default:
      return { payMethod: 'CARD' } as const
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
      const paymentId = `sub-${crypto.randomUUID()}`

      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId,
        orderName: 'AI 원고지 채점 1개월',
        totalAmount: 5000,
        currency: 'CURRENCY_KRW',
        customer: {
          customerId: userId,
          email: userEmail,
          fullName: userName,
        },
        // 모바일 등 리다이렉트 결제는 이 주소로 paymentId를 달고 돌아온다.
        redirectUrl: `${window.location.origin}/subscribe/success`,
        ...portoneMethodParams(method),
      })

      // PC(팝업/iframe)에서는 Promise가 resolve된다. code가 있으면 실패.
      if (response?.code !== undefined) {
        setError(response.message ?? '결제 중 오류가 발생했습니다.')
        return
      }

      // 결제 성공 → 서버 검증 페이지로 이동(여기서 실제 구독 발급)
      window.location.href =
        `/subscribe/success?paymentId=${encodeURIComponent(response!.paymentId)}`
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? '결제 중 오류가 발생했습니다.')
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
