'use client'

import { Star } from 'lucide-react'

type Review = {
  id: string
  display_name: string
  content: string
  rating: number
  created_at: string
  exam_score?: number | null
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
        {review.exam_score != null && (
          <span className="text-[11px] font-black text-[#d97706] bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
            {review.exam_score}점 합격
          </span>
        )}
      </div>
      <p className="text-[#334155] text-sm leading-relaxed mb-4 line-clamp-3">
        &ldquo;{review.content}&rdquo;
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#0f172a]">{review.display_name}</span>
        <span className="text-xs text-[#94a3b8]">{timeAgo(review.created_at)}</span>
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
