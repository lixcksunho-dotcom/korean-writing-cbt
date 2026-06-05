import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, PenLine } from 'lucide-react'

// 구독 1개월 가격(원). 클라이언트가 보내온 금액을 그대로 신뢰하지 않고
// 이 값과 일치하는지 서버에서 반드시 검증한다.
const PLAN_PRICE = 5500

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

  // 2. 포트원 서버에 결제 단건 조회로 실제 결제 사실을 검증
  //    (브라우저에서 넘어온 정보는 신뢰하지 않는다)
  const verifyRes = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` },
      cache: 'no-store',
    },
  )

  if (!verifyRes.ok) redirect('/subscribe/fail?reason=confirm')

  const payment = await verifyRes.json()

  // 2-1. 결제 상태가 완료(PAID)인지 확인
  if (payment?.status !== 'PAID') redirect('/subscribe/fail?reason=status')

  // 2-2. 금액 위변조 방지: 실제 결제 금액이 정가와 다르면 거부
  //      (클라이언트가 금액을 조작해 헐값에 구독하는 공격 차단)
  if (Number(payment?.amount?.total) !== PLAN_PRICE) {
    redirect('/subscribe/fail?reason=amount')
  }

  // 3. 구독 발급 — Service Role로만 기록한다.
  //    (RLS상 사용자 본인은 subscriptions에 직접 insert 할 수 없으므로
  //     결제 없이 구독을 자가 발급하는 것이 불가능)
  const admin = createAdminClient()

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  // order_id(=paymentId)에 UNIQUE 제약이 걸려 있어, 새로고침 등으로 같은
  // 주문이 중복 발급되는 것을 DB 레벨에서 막는다.
  const { error: insertError } = await admin.from('subscriptions').insert({
    user_id: user.id,
    payment_key: payment?.pgTxId ?? paymentId,
    order_id: paymentId,
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
          <span className="font-semibold text-[#0f172a]">5,500원</span> 결제가 완료되었습니다.
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
