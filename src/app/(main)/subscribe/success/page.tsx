import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, PenLine } from 'lucide-react'

// 구독 1개월 가격(원). 클라이언트가 보내온 금액을 그대로 신뢰하지 않고
// 이 값과 일치하는지 서버에서 반드시 검증한다.
const PLAN_PRICE = 5000

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>
}) {
  const { paymentKey, orderId, amount } = await searchParams

  if (!paymentKey || !orderId || !amount) redirect('/subscribe')

  // 0. 금액 위변조 방지: URL로 넘어온 금액이 정가와 다르면 즉시 거부
  //    (클라이언트 결제 요청 금액을 조작해 헐값에 구독하는 공격 차단)
  if (Number(amount) !== PLAN_PRICE) redirect('/subscribe/fail?reason=amount')

  // 1. 인증 확인
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. 토스 서버에 결제 확인
  const confirmRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount: PLAN_PRICE }),
    cache: 'no-store',
  })

  if (!confirmRes.ok) redirect('/subscribe/fail?reason=confirm')

  // 3. 구독 발급 — Service Role로만 기록한다.
  //    (RLS상 사용자 본인은 subscriptions에 직접 insert 할 수 없으므로
  //     결제 없이 구독을 자가 발급하는 것이 불가능)
  const admin = createAdminClient()

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  // order_id에 UNIQUE 제약이 걸려 있어, 새로고침 등으로 같은 주문이
  // 중복 발급되는 것을 DB 레벨에서 막는다.
  const { error: insertError } = await admin.from('subscriptions').insert({
    user_id: user.id,
    payment_key: paymentKey,
    order_id: orderId,
    amount: PLAN_PRICE,
    status: 'active',
    expires_at: expiresAt.toISOString(),
  })

  // 23505 = unique_violation: 이미 처리된 주문(새로고침 등)이므로 성공 화면을 그대로 보여줌
  if (insertError && insertError.code !== '23505') {
    redirect('/subscribe/fail?reason=save')
  }

  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.08)] p-10">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-black text-[#0f172a] mb-2">결제 완료!</h1>
        <p className="text-[#64748b] text-sm mb-1">
          <span className="font-semibold text-[#0f172a]">5,000원</span> 결제가 완료되었습니다.
        </p>
        <p className="text-[#94a3b8] text-xs mb-8">
          {expiresAt.toLocaleDateString('ko-KR')} 까지 AI 원고지 채점을 이용할 수 있어요.
        </p>
        <Link
          href="/manuscript"
          className="w-full btn-gold flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm"
        >
          <PenLine className="h-4 w-4" />
          AI 채점 바로 시작하기
        </Link>
        <Link href="/dashboard" className="block mt-3 text-sm text-[#64748b] hover:text-[#334155] transition-colors">
          대시보드로 이동
        </Link>
      </div>
    </div>
  )
}
