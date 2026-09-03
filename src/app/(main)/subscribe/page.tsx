import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getActiveSubscription, daysUntilExpiry } from '@/lib/subscription'
import PaymentSection from '@/components/subscribe/PaymentSection'
import PromoCodeBox from '@/components/subscribe/PromoCodeBox'
import { blogRewardQuota } from '@/lib/blogRewardQuota'
import EventTracker from '@/components/analytics/EventTracker'
import { CheckCircle2, Sparkles, Shield, Zap, LogIn, Star, Ticket, ChevronDown } from 'lucide-react'

const FEATURES = [
  'AI 예상 점수·합격 등급 판정 (지금 실력이면 몇 점?)',
  '모의고사 서술형 AI 분석·채점 무제한',
  '원고지 AI 채점·첨삭 무제한',
  '항목별 점수 + 잘한 점·보완점 첨삭',
  '잠긴 모의고사 전 회차 + 영역별·유형별 집중 연습',
]

// 비로그인 방문자도 상품·가격·환불정책을 볼 수 있어야 한다(간편결제 가맹 심사 요건).
// 실제 결제(PaymentSection)만 로그인 뒤에 노출하고, 비로그인은 로그인 유도 버튼으로 대체한다.
export default async function SubscribePage(
  { searchParams }: { searchParams: Promise<{ promo?: string }> },
) {
  // 이벤트 안내에서 들어오면 접힌 상자를 펴 둔다 — 눌러서 찾게 하면 거기서 떨어져 나간다.
  const openPromo = (await searchParams).promo === '1'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const rewardQuota = await blogRewardQuota()

  const copy = {
    subtitle: 'AI 채점·분석까지, 5,500원 1회 결제로 30일 무제한',
    valueProp: '한국실용글쓰기 응시료(약 2~3만원)보다 훨씬 저렴하게, 합격 전까지 무제한 AI 첨삭',
    refund: 'AI 채점을 한 번도 쓰지 않았다면 100% 돌려드려요.',
  }

  // 결제 직전이 사회적 증거가 가장 잘 먹히는 자리 — 공개된 실사용 후기를 함께 보여 준다.
  const { data: reviews } = await supabase
    .from('reviews')
    // verified도 같이 — 확인 안 된 점수는 결제 직전 화면에 숫자로 내보내지 않는다.
    .select('display_name, content, rating, exam_score, verified')
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(3)
  const reviewCount = reviews?.length ?? 0
  const avgRating = reviewCount
    ? reviews!.reduce((s, r) => s + (r.rating ?? 0), 0) / reviewCount
    : 0

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
          <div className="text-xs text-[#64748b]">
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
          프리미엄 플랜
        </div>
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">프리미엄 플랜 이용권</h1>
        <p className="text-[#64748b] text-sm mt-1">{copy.subtitle}</p>
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
          <p className="text-white/50 text-xs mt-3">{copy.valueProp}</p>
        </div>

        <div className="p-6">
          {/* 상품 정보 */}
          <div className="mb-5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-4 text-sm text-[#334155] space-y-1.5">
            <div className="flex justify-between"><span className="text-[#64748b]">상품명</span><span className="font-semibold">프리미엄 플랜 (30일)</span></div>
            <div className="flex justify-between"><span className="text-[#64748b]">이용기간</span><span className="font-semibold">결제일로부터 30일</span></div>
            <div className="flex justify-between"><span className="text-[#64748b]">결제금액</span><span className="font-semibold">5,500원 (부가세 포함)</span></div>
            <div className="flex justify-between"><span className="text-[#64748b]">결제방식</span><span className="font-semibold">1회 결제 (자동결제 없음)</span></div>
          </div>

          {/* 포함 기능 */}
          <div className="space-y-2.5 mb-6">
            {FEATURES.map(f => (
              <div key={f} className="flex items-start gap-2.5 text-sm text-[#334155]">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                {f}
              </div>
            ))}
          </div>

          {/* 실사용 후기 — 표본이 너무 적으면 오히려 역효과라 3건 이상일 때만 */}
          {reviewCount >= 3 && (
            <div className="mb-6 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-black text-[#0f172a]">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-[#64748b]">실사용 후기</span>
              </div>
              <div className="space-y-2">
                {reviews!.map((r, i) => (
                  <p key={i} className="text-xs text-[#475569] leading-relaxed line-clamp-2">
                    “{r.content}”
                    <span className="text-[#64748b]">
                      {' — '}{r.display_name}
                      {r.exam_score && r.verified ? ` · ${r.exam_score}점` : ''}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          )}

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
              <p className="text-center text-xs text-[#64748b]">
                결제는 로그인 후 진행되며, 카드 · 간편결제로 결제할 수 있어요.
              </p>
            </div>
          )}

          {/* 환불 보장 */}
          <div className="mt-4 flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-xs text-emerald-700">
            <Shield className="h-4 w-4 shrink-0" />
            <span><b>7일 내 미사용 전액 환불</b> — {copy.refund}</span>
          </div>

          {/* 약관·정책 링크 (심사·고지) */}
          <div className="mt-3 flex items-center justify-center gap-3 text-xs text-[#64748b]">
            <Link href="/terms" className="inline-block py-3.5 underline hover:text-[#1e3a5f]">이용약관</Link>
            <span aria-hidden className="text-[#cbd5e1]">·</span>
            <Link href="/refund" className="inline-block py-3.5 underline hover:text-[#1e3a5f]">취소·환불 정책</Link>
            <span aria-hidden className="text-[#cbd5e1]">·</span>
            <Link href="/privacy" className="inline-block py-3.5 underline hover:text-[#1e3a5f]">개인정보처리방침</Link>
          </div>

          {/* 안전 결제 배지 */}
          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-[#64748b]">
            <Shield className="h-3.5 w-3.5" />
            포트원(PortOne) 안전결제 · SSL 암호화 · 자동결제 없음
          </div>

          {/* 계정 공유 금지 고지 — 실제 코드에 걸려 있는 한도(DEVICE_LIMIT·DAILY_GRADE_LIMIT)를
              그대로 적는다. '무제한'이라고 하면서 숨은 한도를 두면 걸린 사람 입장에선 속은 것이다. */}
          <p className="mt-3 text-xs text-[#64748b] text-center leading-relaxed">
            이용권은 결제한 본인 1인 전용이며, 기기 3대까지 사용할 수 있어요. 계정 공유 등 부정 이용이
            확인되면 이용이 제한될 수 있고, 이 경우 환불은 제공되지 않습니다.
            <br />
            AI 첨삭은 기간 내 횟수 제한이 없지만, 자동화·대량 이용을 막기 위해 하루 30회까지 받을 수 있어요.
          </p>
        </div>
      </div>

      {/* 코드 넣는 자리만 결제 화면에 남긴다 — 코드를 들고 온 사람은 결제하려던 사람이다.
          블로그 후기 이벤트는 조건이 다섯 가지라 여기서 다룰 일이 아니고, 무엇보다
          결제 버튼 옆에서 공짜 경로를 같이 팔면 돈을 내려던 사람이 멈춘다.
          제 페이지로 옮기고 여기서는 한 줄로만 잇는다. */}
      {user && (
        <details id="promo-code" open={openPromo} className="group mt-4 rounded-2xl border border-[#e2e8f0] bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 text-sm font-bold text-[#334155]">
            <span className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-[#d97706]" aria-hidden="true" />
              행사 코드가 있으신가요?
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#94a3b8] transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="border-t border-[#e2e8f0] p-5">
            <PromoCodeBox />
          </div>
        </details>
      )}

      {rewardQuota.total > 0 && !rewardQuota.closed && (
        <p className="mt-3 text-center text-xs text-[#64748b]">
          블로그에 후기를 쓰고 이용권을 받는{' '}
          <Link href="/event/blog-review" className="font-semibold text-[#1e3a5f] underline underline-offset-2">
            후기 이벤트
          </Link>
          도 있어요.
        </p>
      )}
    </div>
  )
}
