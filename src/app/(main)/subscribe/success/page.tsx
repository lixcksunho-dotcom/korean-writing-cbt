import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, PenLine } from 'lucide-react'
import PurchaseTracker from '@/components/analytics/PurchaseTracker'
import EventTracker from '@/components/analytics/EventTracker'
import { grantSubscriptionForPayment, PLAN_PRICE } from '@/lib/payment'

export default async function SuccessPage({
  searchParams,
}: {
  // 포트원은 PC(팝업)에서는 paymentId만, 모바일 리다이렉트에서는
  // code/message까지 함께 붙여서 돌아온다.
  searchParams: Promise<{ paymentId?: string; code?: string; message?: string }>
}) {
  const { paymentId, code, message } = await searchParams

  // 모바일 리다이렉트에서 결제가 실패하면 code가 실려서 돌아온다.
  if (code) {
    redirect(`/subscribe/fail?code=${encodeURIComponent(code)}&message=${encodeURIComponent(message ?? '')}`)
  }
  if (!paymentId) redirect('/subscribe')

  // 1. 인증 확인
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. 검증 + 구독 발급은 공용 함수에 위임(웹훅·관리자 복구와 동일 로직).
  //    expectedUserId로 결제 customerId와 로그인 사용자가 같은지 교차검증한다.
  const result = await grantSubscriptionForPayment(paymentId, { expectedUserId: user.id })

  if (!result.ok) {
    // reason → 기존 실패 페이지 매핑 유지
    const reasonMap: Record<string, string> = {
      not_found: 'confirm',
      status: 'status',
      amount: 'amount',
      no_user: 'confirm',
      user_mismatch: 'confirm',
      save: 'save',
    }
    redirect(`/subscribe/fail?reason=${reasonMap[result.reason] ?? 'confirm'}`)
  }

  const expiresAt = new Date(result.expiresAt)

  return (
    <div className="max-w-md mx-auto py-16 text-center">
      {/* GA4 결제 전환 이벤트(설정 시에만 발생) */}
      <PurchaseTracker orderId={paymentId} amount={PLAN_PRICE} />
      {/* 1차파티 전환 이벤트(GA4 없이도 측정) */}
      <EventTracker event="purchase_success" meta={String(PLAN_PRICE)} />
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.08)] p-10">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-black text-[#0f172a] mb-2">결제 완료!</h1>
        <p className="text-[#64748b] text-sm mb-1">
          <span className="font-semibold text-[#0f172a]">5,500원</span> 결제가 완료되었습니다.
        </p>
        <p className="text-[#94a3b8] text-xs mb-8">
          {expiresAt.toLocaleDateString('ko-KR')} 까지 프리미엄 플랜을 이용할 수 있어요.
        </p>
        <Link
          href="/dashboard"
          className="w-full btn-gold flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm"
        >
          <PenLine className="h-4 w-4" />
          바로 시작하기
        </Link>
        <Link href="/dashboard" className="block mt-3 text-sm text-[#64748b] hover:text-[#334155] transition-colors">
          대시보드로 이동
        </Link>
      </div>
    </div>
  )
}
