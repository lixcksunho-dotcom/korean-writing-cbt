'use client'

import { useState } from 'react'
import * as PortOne from '@portone/browser-sdk/v2'

type Method = 'card'

const METHODS: { key: Method; label: string; emoji: string; color: string }[] = [
  { key: 'card', label: '카드 결제', emoji: '💳', color: 'border-[#1e3a5f] bg-[#1e3a5f] text-white' },
]

// 포트원 V2 결제수단 매핑. 현재 카드결제만 사용(payMethod 'CARD').
// as const 로 리터럴 타입을 확정해야 PaymentRequest 판별 유니온에 맞는다.
function portoneMethodParams(_method: Method) {
  return { payMethod: 'CARD' } as const
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
  const [agreed, setAgreed] = useState(false)

  async function handlePayment(method: Method) {
    if (!agreed) { setError('결제 전 이용약관·환불정책에 동의해 주세요.'); return }

    // 포트원 키 미설정 가드: storeId/channelKey가 비면 SDK가 cryptic 에러를 내므로 먼저 차단
    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY
    if (!storeId || !channelKey) {
      setError('결제 설정이 준비 중입니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.')
      return
    }

    setError('')
    setLoading(method)
    try {
      const paymentId = `sub-${crypto.randomUUID()}`

      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId,
        orderName: 'AI 원고지 채점 1개월',
        totalAmount: 5500,
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
      window.location.assign(
        `/subscribe/success?paymentId=${encodeURIComponent(response!.paymentId)}`
      )
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? '결제 중 오류가 발생했습니다.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* 약관·환불정책 동의 (결제 필수) */}
      <label className="flex items-start gap-2 text-xs text-[#475569] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3.5 py-3 cursor-pointer">
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1e3a5f] shrink-0" />
        <span>
          <a href="/terms" target="_blank" className="text-[#1e3a5f] font-semibold underline">이용약관</a> 및{' '}
          <a href="/refund" target="_blank" className="text-[#1e3a5f] font-semibold underline">취소·환불 정책</a>을 확인했으며,
          본 상품이 1회 결제·30일 이용권(자동결제 없음)이고 계정 공유 등 부정 이용 시 환불이 제한됨에 동의합니다.
        </span>
      </label>

      {METHODS.map(({ key, label, emoji, color }) => (
        <button
          key={key}
          onClick={() => handlePayment(key)}
          disabled={loading !== null || !agreed}
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
