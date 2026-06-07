'use client'

import { useEffect } from 'react'

// 결제 완료 화면에서 GA4 'purchase' 전환 이벤트를 1회 발생시킨다.
// GA가 설정돼 있지 않으면(window.gtag 없음) 조용히 아무 일도 하지 않는다.
// 새로고침 시 중복 집계를 막기 위해 orderId 기준으로 sessionStorage 가드.
export default function PurchaseTracker({
  orderId,
  amount,
}: {
  orderId: string
  amount: number
}) {
  useEffect(() => {
    const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag
    if (!gtag) return
    const key = `purchase_tracked_${orderId}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')

    gtag('event', 'purchase', {
      transaction_id: orderId,
      value: amount,
      currency: 'KRW',
      items: [{ item_id: 'kpt_pass_30d', item_name: 'AI 채점 30일 이용권', price: amount, quantity: 1 }],
    })
  }, [orderId, amount])

  return null
}
