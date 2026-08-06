'use client'

import { Star, BadgeCheck } from 'lucide-react'

type Review = {
  id: string
  display_name: string
  content: string
  rating: number
  created_at: string
  exam_score?: number | null
  verified?: boolean | null
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return '오늘'
  if (d < 7) return `${d}일 전`
  if (d < 30) return `${Math.floor(d / 7)}주 전`
  return `${Math.floor(d / 30)}개월 전`
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="shrink-0 w-72 bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-5 mx-2.5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s}
              className={`h-3.5 w-3.5 ${s <= review.rating ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-[#e2e8f0]'}`}
            />
          ))}
        </div>
        {/* 점수는 인증 사진을 확인한 뒤에만 보여 준다.
            후기 자체는 작성 즉시 노출되지만(참여를 막지 않으려고), 확인 안 된 점수를
            "820점 합격"처럼 단정해 보여 주면 방문자는 그걸 사실로 읽는다.
            이름 옆 '인증' 표시보다 이 배지가 훨씬 눈에 띈다. */}
        {review.exam_score != null && review.verified && (
          <span className="text-xs font-black text-[#d97706] bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
            {review.exam_score}점 합격
          </span>
        )}
      </div>
      <p className="text-[#334155] text-sm leading-relaxed mb-4 line-clamp-3">
        &ldquo;{review.content}&rdquo;
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#0f172a] flex items-center gap-1">
          {review.display_name}
          {review.verified && (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700" title="점수 인증 완료">
              <BadgeCheck className="h-3.5 w-3.5" /> 인증
            </span>
          )}
        </span>
        <span className="text-xs text-[#64748b]">{timeAgo(review.created_at)}</span>
      </div>
    </div>
  )
}

export default function ReviewMarquee({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null

  // 카드가 적으면 복제해서 채우기
  const filled = reviews.length < 6
    ? [...reviews, ...reviews, ...reviews]
    : reviews

  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div
        className="flex"
        style={{
          animation: `marquee ${filled.length * 4}s linear infinite`,
          width: 'max-content',
        }}
        onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
        onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
      >
        {/* 두 세트 복제 → 끊김 없는 루프 */}
        {[...filled, ...filled].map((review, i) => (
          <ReviewCard key={`${review.id}-${i}`} review={review} />
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
