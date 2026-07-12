'use client'

import { useState } from 'react'
import * as PortOne from '@portone/browser-sdk/v2'
import { trackEvent } from '@/lib/analytics/trackEvent'

type Method = 'card' | 'easypay'

const METHODS: { key: Method; label: string; emoji: string; color: string }[] = [
  { key: 'card', label: '카드 결제', emoji: '💳', color: 'border-[#1e3a5f] bg-[#1e3a5f] text-white' },
  { key: 'easypay', label: '간편결제', emoji: '⚡', color: 'border-[#1e3a5f] bg-white text-[#1e3a5f]' },
]

// 포트원 V2 결제수단 매핑. 카드(CARD) + 간편결제(EASY_PAY, provider 미지정).
// EASY_PAY는 기존 PG(KG이니시스) 채널에 활성화된 간편결제(삼성페이·카카오페이 등)를 결제창에서 노출한다.
// 별도 채널/계약 없이 기존 채널키로 동작 — provider를 지정하지 않으면 이니시스가 가능한 수단을 보여준다.
function portoneMethodParams(method: Method) {
  if (method === 'easypay') {
    return { payMethod: 'EASY_PAY' } as const
  }
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
  const [phone, setPhone] = useState('')

  async function handlePayment(method: Method) {
    if (!agreed) { setError('결제 전 이용약관·환불정책에 동의해 주세요.'); return }

    // KG이니시스 V2 일반결제는 구매자 휴대폰 번호가 필수
    const phoneDigits = phone.replace(/\D/g, '')
    if (!/^01[0-9]\d{7,8}$/.test(phoneDigits)) {
      setError('휴대폰 번호를 정확히 입력해 주세요. (예: 010-1234-5678)')
      return
    }

    // 포트원 키 미설정 가드: storeId/channelKey가 비면 SDK가 cryptic 에러를 내므로 먼저 차단
    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY
    if (!storeId || !channelKey) {
      setError('결제 설정이 준비 중입니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.')
      return
    }

    setError('')
    setLoading(method)
    trackEvent('payment_started', method)  // 결제창 진입(체크아웃 인텐트) 전환 측정
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
          phoneNumber: phone.replace(/\D/g, ''),
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

  // 휴대폰 번호 자동 하이픈 포맷 (010-1234-5678)
  function onPhoneChange(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    let out = d
    if (d.length >= 4 && d.length < 8) out = `${d.slice(0, 3)}-${d.slice(3)}`
    else if (d.length >= 8) out = `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
    setPhone(out)
  }

  return (
    <div className="space-y-3">
      {/* 휴대폰 번호 (KG이니시스 결제 필수) */}
      <div>
        <label className="block text-xs font-semibold text-[#475569] mb-1.5">휴대폰 번호 <span className="text-red-400">*</span></label>
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={e => onPhoneChange(e.target.value)}
          placeholder="010-1234-5678"
          className="w-full rounded-xl border border-[#e2e8f0] px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
        />
      </div>

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
