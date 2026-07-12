import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getActiveSubscription, daysUntilExpiry } from '@/lib/subscription'
import PaymentSection from '@/components/subscribe/PaymentSection'
import EventTracker from '@/components/analytics/EventTracker'
import { CheckCircle2, Sparkles, Shield, Zap, LogIn } from 'lucide-react'

const FEATURES = [
  'AI 예상 점수·합격 등급 판정 (지금 실력이면 몇 점?)',
  '모의고사 서술형 AI 분석·채점 무제한',
  '원고지 AI 채점·첨삭 무제한',
  '항목별 점수 + 잘한 점·보완점 첨삭',
  '영역별 약점 분석 · 채점 기록 저장',
]

// 비로그인 방문자도 상품·가격·환불정책을 볼 수 있어야 한다(간편결제 가맹 심사 요건).
// 실제 결제(PaymentSection)만 로그인 뒤에 노출하고, 비로그인은 로그인 유도 버튼으로 대체한다.
export default async function SubscribePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const sub = user ? await getActiveSubscription(user.id) : null
  const displayName = user
    ? (user.user_metadata?.name || user.email?.split('@')[0] || '회원')
    : ''

  // 이미 구독 중
  if (user && sub) {
    const days = daysUntilExpiry(sub.expires_at)
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.08)] p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-black text-[#0f172a] mb-2">구독 중이에요!</h1>
          <p className="text-[#64748b] text-sm mb-5">
            <span className="font-semibold text-[#0f172a]">{days}일</span> 후 만료
            ({new Date(sub.expires_at).toLocaleDateString('ko-KR')} 까지)
          </p>
          <div className="bg-[#f8fafc] rounded-xl p-4 text-left space-y-2 mb-6">
            {FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-[#334155]">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <div className="text-xs text-[#94a3b8]">
            자동 결제가 없는 1회 이용권이에요. 만료 후 다시 결제하면 30일 연장됩니다.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <EventTracker event="subscribe_view" />
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          AI 채점 구독
        </div>
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">AI 채점·분석 이용권</h1>
        <p className="text-[#64748b] text-sm mt-1">서술형·원고지 모두, 5,500원 1회 결제로 30일 무제한</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.08)] overflow-hidden">
        {/* 가격 헤더 */}
        <div className="bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-7 text-center text-white">
          <div className="text-4xl sm:text-5xl font-black mb-1">5,500<span className="text-2xl font-bold">원</span></div>
          <div className="text-white/60 text-sm">30일 무제한 · 1회 결제 · 부가세 포함</div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-xs">
              <Zap className="h-3.5 w-3.5 text-[#f59e0b]" /> 결제 즉시 이용
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-xs">
              ✓ 자동결제 없음
            </span>
          </div>
          <p className="text-white/50 text-xs mt-3">한국실용글쓰기 응시료(약 2~3만원)보다 훨씬 저렴하게, 합격 전까지 무제한 AI 첨삭</p>
        </div>

        <div className="p-6">
          {/* 상품 정보 */}
          <div className="mb-5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-4 text-sm text-[#334155] space-y-1.5">
            <div className="flex justify-between"><span className="text-[#64748b]">상품명</span><span className="font-semibold">AI 원고지·서술형 채점 이용권</span></div>
            <div className="flex justify-between"><span className="text-[#64748b]">이용기간</span><span className="font-semibold">결제일로부터 30일</span></div>
            <div className="flex justify-between"><span className="text-[#64748b]">결제금액</span><span className="font-semibold">5,500원 (부가세 포함)</span></div>
            <div className="flex justify-between"><span className="text-[#64748b]">결제방식</span><span className="font-semibold">1회 결제 (자동결제 없음)</span></div>
          </div>

          {/* 포함 기능 */}
          <div className="space-y-2.5 mb-6">
            {FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-[#334155]">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>

          {/* 결제 영역: 로그인 상태면 결제 버튼, 비로그인이면 로그인 유도 */}
          {user ? (
            <PaymentSection
              userId={user.id}
              userEmail={user.email ?? ''}
              userName={displayName}
            />
          ) : (
            <div className="space-y-3">
              <Link
                href="/login?redirect=/subscribe"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm border-2 border-[#1e3a5f] bg-[#1e3a5f] text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <LogIn className="h-4 w-4" />
                로그인하고 결제하기
              </Link>
              <p className="text-center text-xs text-[#94a3b8]">
                결제는 로그인 후 진행되며, 카드 · 간편결제로 결제할 수 있어요.
              </p>
            </div>
          )}

          {/* 환불 보장 */}
          <div className="mt-4 flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-xs text-emerald-700">
            <Shield className="h-4 w-4 shrink-0" />
            <span><b>7일 내 미사용 전액 환불</b> — AI 채점을 한 번도 쓰지 않았다면 100% 돌려드려요.</span>
          </div>

          {/* 약관·정책 링크 (심사·고지) */}
          <div className="mt-3 flex items-center justify-center gap-3 text-xs text-[#64748b]">
            <Link href="/terms" className="underline hover:text-[#1e3a5f]">이용약관</Link>
            <span className="text-[#cbd5e1]">·</span>
            <Link href="/refund" className="underline hover:text-[#1e3a5f]">취소·환불 정책</Link>
            <span className="text-[#cbd5e1]">·</span>
            <Link href="/privacy" className="underline hover:text-[#1e3a5f]">개인정보처리방침</Link>
          </div>

          {/* 안전 결제 배지 */}
          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-[#94a3b8]">
            <Shield className="h-3.5 w-3.5" />
            포트원(PortOne) 안전결제 · SSL 암호화 · 자동결제 없음
          </div>

          {/* 계정 공유 금지 고지 */}
          <p className="mt-3 text-[11px] text-[#94a3b8] text-center leading-relaxed">
            이용권은 결제한 본인 1인 전용이며, 기기 3대까지 사용할 수 있어요. 계정 공유 등 부정 이용이
            확인되면 이용이 제한될 수 있고, 이 경우 환불은 제공되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
