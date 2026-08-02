import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Receipt, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { isActivePass } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

export default async function PaymentHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('subscriptions')
    .select('id, amount, status, started_at, expires_at, order_id')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })

  const subs = rows ?? []

  return (
    <div className="animate-fade-up max-w-2xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
        <ArrowLeft className="h-4 w-4" /> 대시보드
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">결제 내역</h1>
        <p className="text-[#64748b] text-sm">이용권 결제·이용 기록이에요. 영수증·환불 문의는 고객센터로 보내주세요.</p>
      </div>

      {subs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-[#e2e8f0]">
          <div className="bg-[#f1f5f9] p-5 rounded-2xl mb-4"><Receipt className="h-10 w-10 text-[#64748b]" /></div>
          <p className="text-[#64748b] text-sm font-medium">결제 내역이 없어요.</p>
          <Link href="/subscribe" className="mt-4 btn-gold inline-flex items-center gap-1.5 font-bold px-5 py-2.5 rounded-xl text-sm">
            이용권 보기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map(s => {
            const active = isActivePass(s.status as string, s.expires_at as string)
            const expired = s.status === 'active' && !active
            const cancelled = s.status === 'cancelled'
            const badge = active
              ? { icon: <CheckCircle2 className="h-3.5 w-3.5" />, text: '이용 중', cls: 'bg-emerald-100 text-emerald-700' }
              : cancelled
                ? { icon: <XCircle className="h-3.5 w-3.5" />, text: '해지됨', cls: 'bg-red-50 text-red-500' }
                : expired
                  ? { icon: <Clock className="h-3.5 w-3.5" />, text: '만료됨', cls: 'bg-[#f1f5f9] text-[#64748b]' }
                  : { icon: <Clock className="h-3.5 w-3.5" />, text: s.status as string, cls: 'bg-[#f1f5f9] text-[#64748b]' }
            return (
              <div key={s.id as string} className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#0f172a]">AI 채점 30일 이용권</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.icon}{badge.text}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#334155] font-semibold">{(Number(s.amount) || 0).toLocaleString()}원</span>
                  <span className="text-xs text-[#64748b]">
                    {new Date(s.started_at as string).toLocaleDateString('ko-KR')} ~ {new Date(s.expires_at as string).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <p className="text-[11px] text-[#cbd5e1] mt-2 truncate">주문번호 {s.order_id as string}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
