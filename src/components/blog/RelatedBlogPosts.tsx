import Link from 'next/link'
import CategoryIcon from '@/components/blog/CategoryIcon'
import { getPostsByCategory, catTheme, formatDate } from '@/lib/blog'

// 학습자료 페이지 → 같은 주제의 블로그 글로 잇는 블록.
// 블로그가 푸터로만 닿아 있어 사실상 크롤 섬이었다. 검색에 먼저 잡히는 건 학습자료
// 페이지들이므로, 거기서 주제가 같은 글로 내려보내야 글이 발견되고 체류도 이어진다.
export default function RelatedBlogPosts({
  category,
  limit = 4,
  seed,
}: {
  category: string
  limit?: number
  /** 페이지마다 다른 글이 걸리게 하는 고정 씨앗(보통 페이지 이름). 없으면 최신순 그대로. */
  seed?: string
}) {
  // 앞에서 4개를 그냥 자르면(최신순) 같은 카테고리의 학습자료 여러 면이 전부 같은 글을
  // 건다. 나머지 글은 여기서 들어오는 링크가 없어 크롤이 잘 닿지 않고, 여러 면을 둘러보는
  // 사람에게도 매번 같은 목록이 뜬다. 페이지마다 시작 지점을 옮겨 고르게 퍼뜨린다.
  // 무작위가 아니라 seed 기반이라 같은 페이지는 늘 같은 글을 보여 준다(정적 산출물 안정).
  const all = getPostsByCategory(category)
  let offset = 0
  if (seed) for (const ch of seed) offset = (offset + ch.codePointAt(0)!) % 100000
  const posts = Array.from({ length: Math.min(limit, all.length) }, (_, i) => all[(offset + i) % all.length])
  if (posts.length === 0) return null

  const t = catTheme(category)

  return (
    <section className="mt-10">
      <h2 className="text-lg font-black text-[#0f172a] mb-3">
        <CategoryIcon slug={category} className="inline h-4 w-4 align-[-0.2em]" /> 이 주제의 글 더 보기
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
        className="inline-block mt-3 py-3 text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f]"
      >
        {t.label} 글 전체 보기 →
      </Link>
    </section>
  )
}
