import Link from 'next/link'
import type { BlogPost } from '@/lib/blog'
import { formatDate, catTheme } from '@/lib/blog'

// 블로그 목록의 글 카드. 이미지가 없어 밋밋해 보이지 않도록, 카테고리 색 그라디언트
// 커버 + 아이콘으로 시각적 무게를 준다.
export default function PostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  const t = catTheme(post.category)

  if (featured) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="card-hover group block overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_10px_40px_rgba(15,31,61,0.10)]"
      >
        <div
          className="relative px-6 py-10 sm:px-8 sm:py-12"
          style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
        >
          <span aria-hidden className="absolute right-5 top-5 text-4xl opacity-30 select-none">{t.icon}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/90 bg-white/15 rounded-full px-3 py-1 backdrop-blur">
            {t.icon} {post.categoryLabel}
          </span>
          <p className="mt-3 text-2xl sm:text-[1.7rem] font-black text-white leading-tight drop-shadow-sm">
            {post.title}
          </p>
        </div>
        <div className="px-6 py-4 sm:px-8 sm:py-5">
          {post.excerpt && (
            <p className="text-[#475569] leading-relaxed line-clamp-2">{post.excerpt}</p>
          )}
          <p className="mt-3 text-xs text-[#64748b]">{formatDate(post.date)} · 자세히 보기 →</p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_4px_16px_rgba(15,31,61,0.06)]"
    >
      {/* 카테고리 색 커버 밴드 */}
      <div
        className="relative h-2"
        style={{ background: `linear-gradient(90deg, ${t.from}, ${t.to})` }}
      />
      <div className="flex-1 p-5">
        <span
          className="inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-0.5"
          style={{ background: t.tint, color: t.ink }}
        >
          {t.icon} {post.categoryLabel}
        </span>
        <p className="mt-2.5 font-black text-[#0f172a] text-lg leading-snug group-hover:text-[#1e3a5f]">
          {post.title}
        </p>
        {post.excerpt && (
          <p className="mt-2 text-sm text-[#64748b] leading-relaxed line-clamp-2">{post.excerpt}</p>
        )}
        <p className="mt-3 text-xs text-[#64748b]">{formatDate(post.date)}</p>
      </div>
    </Link>
  )
}
