import Link from 'next/link'
import { getPostsByCategory, catTheme, formatDate } from '@/lib/blog'

// 학습자료 페이지 → 같은 주제의 블로그 글로 잇는 블록.
// 블로그가 푸터로만 닿아 있어 사실상 크롤 섬이었다. 검색에 먼저 잡히는 건 학습자료
// 페이지들이므로, 거기서 주제가 같은 글로 내려보내야 글이 발견되고 체류도 이어진다.
export default function RelatedBlogPosts({
  category,
  limit = 4,
}: {
  category: string
  limit?: number
}) {
  const posts = getPostsByCategory(category).slice(0, limit)
  if (posts.length === 0) return null

  const t = catTheme(category)

  return (
    <section className="mt-10">
      <h2 className="text-lg font-black text-[#0f172a] mb-3">
        {t.icon} 이 주제의 글 더 보기
      </h2>
      <ul className="grid sm:grid-cols-2 gap-2">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/blog/${p.slug}`}
              className="block rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 hover:border-[#cbd5e1] transition-colors"
            >
              <span className="block text-sm font-bold text-[#1e3a5f] leading-snug">{p.title}</span>
              <span className="block mt-1 text-xs text-[#64748b]">{formatDate(p.date)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/blog/category/${category}`}
        className="inline-block mt-3 text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f]"
      >
        {t.label} 글 전체 보기 →
      </Link>
    </section>
  )
}
