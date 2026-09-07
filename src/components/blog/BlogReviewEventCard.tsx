import Link from 'next/link'
import { PenLine, ArrowRight } from 'lucide-react'
import { blogRewardQuota } from '@/lib/blogRewardQuota'
import { MIN_CHARS, MIN_IMAGES, REWARD_DAYS } from '@/lib/blogPromoRules'

// 블로그 후기 이벤트로 가는 문. 글을 끝까지 읽은 사람(블로그 글 아래)과 로그인한 사람(대시보드)이 만난다.
//
// 왜 필요한가: 이벤트 페이지는 있는데 들어가는 길이 구독 화면의 작은 링크 하나뿐이었다 —
// 2026-09-07 기준 참여 0건. 첫 화면 팝업은 정책상 꺼져 있다(실제 통과 사례가 나올 때까지).
// 조건(사진 N장·글자 N자)을 여기서부터 말해 준다 — 들어가서야 알면 그냥 나간다.
//
// 자리가 다 차면 그리지 않는다. (실글패스는 결제가 열려 있어 이용권이 늘 값을 가진다 — KBS패스 쪽엔 결제 열림 조건이 하나 더 있다)
export default async function BlogReviewEventCard() {
  let quota
  try { quota = await blogRewardQuota() } catch { return null } // 세는 데 실패하면 문을 안 그린다 — 홍보가 서버 문제로 번지면 안 된다
  if (quota.closed) return null

  return (
    <Link
      href="/event/blog-review"
      className="group mt-4 flex items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_4px_16px_rgba(15,31,61,0.06)] transition-colors hover:border-[#cbd5e1]"
    >
      <div className="rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-3 shadow-lg shadow-emerald-500/20">
        <PenLine className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#0f172a]">
          블로그에 후기를 쓰면 이용권 {REWARD_DAYS}일을 드려요
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#64748b]">
          사진 {MIN_IMAGES}장 · {MIN_CHARS.toLocaleString('ko-KR')}자 이상 · 광고 표시 한 줄. 조건을 채우면 자동으로 바로 지급됩니다.
          <span className="ml-1 font-semibold text-emerald-700">선착순 {quota.left}자리 남음</span>
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#64748b] transition-transform group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  )
}
