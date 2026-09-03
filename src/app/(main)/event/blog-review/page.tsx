import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveSubscription } from '@/lib/subscription'
import { blogRewardQuota } from '@/lib/blogRewardQuota'
import BlogReviewForm from '@/components/subscribe/BlogReviewForm'
import EventTracker from '@/components/analytics/EventTracker'
import { REWARD_DAYS, MAX_REWARDS } from '@/lib/blogPromoRules'
import { Gift, ArrowRight } from 'lucide-react'

// 행사에 제 페이지를 준다.
//
// 예전엔 결제 화면 아래 접힌 상자 안에 있었다. 그러면 두 가지가 어긋난다.
//   · 결제 화면은 사는 자리인데, 그 안에서 공짜로 받는 길을 같이 판다.
//   · 반대로 행사를 보러 온 사람은 가격표부터 만난다 — 팝업의 '어떻게 쓰는지 보기'가
//     실제로 가격 페이지로 보내고 있었다. 무료 경로를 찾아온 사람에게 값부터 보인 셈이다.
//
// 로그인 없이도 조건을 다 읽을 수 있게 한다. 조건이 다섯 가지라 미리 보고 판단해야 하는데,
// 로그인 뒤에만 보이면 '뭘 해야 하는지도 모르고' 가입부터 해야 한다.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `블로그 후기 이벤트 — 이용권 ${REWARD_DAYS}일 | 실글패스`,
  description: `블로그에 실글패스 후기를 올리고 글 주소를 넣으면 이용권 ${REWARD_DAYS}일을 드립니다. 선착순 ${MAX_REWARDS}명.`,
  alternates: { canonical: 'https://kptest.cloud/event/blog-review' },
  robots: { index: true, follow: true },
}

export default async function BlogReviewEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const quota = await blogRewardQuota()
  const current = user ? await getActiveSubscription(user.id) : null

  return (
    <div className="mx-auto max-w-2xl">
      <EventTracker event="blog_event_view" />

      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
          <Gift className="h-5 w-5 text-[#f59e0b]" aria-hidden="true" />
        </span>
        <p className="text-xs font-bold text-[#f59e0b]">
          블로그 후기 이벤트
          {typeof quota.left === 'number' && quota.total > 0 && (
            <> · {quota.left > 0 ? `${quota.left}자리 남음` : '마감'}</>
          )}
        </p>
        <h1 className="mt-1 text-2xl font-black leading-tight">
          후기 한 편 쓰고<br />이용권 {REWARD_DAYS}일 무료로 받기
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          블로그에 후기를 올리고 글 주소만 넣으면 <b className="text-white">그 자리에서 지급</b>됩니다.
          선착순 {MAX_REWARDS}명이에요.
        </p>
      </div>

      {/* 이미 이용권이 있는 사람에게 '무료로 받으세요'는 실례다. 다만 길은 막지 않는다 —
          기간이 끝난 뒤에 쓰려고 미리 써 두는 사람도 있다. */}
      {current && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
          이미 이용권을 쓰고 계세요. 지금 신청하시면 <b>남은 기간 뒤에 {REWARD_DAYS}일이 이어 붙습니다.</b>
        </p>
      )}

      {/* 조건은 누구나 본다. 넣는 칸만 로그인이 필요하다 — 그 판단은 폼 안에서 한다. */}
      <BlogReviewForm left={quota.left} total={quota.total} signedIn={!!user} headed={false} />

      {/* 조건을 읽고 '그래서 뭐가 좋은데'로 이어질 자리. 값을 보러 온 사람은 여기서 넘어간다. */}
      <div className="mt-6 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5">
        <p className="text-sm font-bold text-[#0f172a]">이용권으로 뭘 할 수 있나요?</p>
        <p className="mt-1 text-xs leading-relaxed text-[#475569]">
          서술형 AI 채점·첨삭 무제한, 잠긴 모의고사 전 회차, 영역별 집중 연습을 씁니다.
        </p>
        <Link
          href="/subscribe"
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-[#1e3a5f] underline underline-offset-4"
        >
          이용권 자세히 보기
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
