import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import BlogHeader from '@/components/blog/BlogHeader'
import PostCard from '@/components/blog/PostCard'
import BlogCTA from '@/components/blog/BlogCTA'
import SiteFooter from '@/components/layout/SiteFooter'
import { CATEGORIES, getCategory, getPostsByCategory } from '@/lib/blog'

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }))
}

// 카테고리는 CATEGORIES 상수로 고정이다. 없는 카테고리도 프로덕션에서 500이 났다.
export const dynamicParams = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cat = getCategory(slug)
  if (!cat) return { title: '카테고리를 찾을 수 없어요' }
  return {
    title: `${cat.label} — 한국실용글쓰기 블로그`,
    // 글 편수를 넣어 카테고리마다 설명이 달라지게 한다(짧은 blurb는 50자도 안 돼 검색결과에서 잘린다).
    description: `${cat.label}: ${cat.blurb}. 한국실용글쓰기 독학에 필요한 글 ${getPostsByCategory(cat.slug).length}편을 모았습니다. 시험 준비하며 궁금했던 것부터 찾아보세요.`,
    alternates: {
      canonical: `/blog/category/${cat.slug}`,
      types: { 'application/rss+xml': 'https://kptest.cloud/rss.xml' },
    },
    openGraph: {
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
      title: `${cat.label} — 한국실용글쓰기 블로그`,
      description: cat.blurb,
      url: `/blog/category/${cat.slug}`,
      type: 'website',
    },
  }
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cat = getCategory(slug)
  if (!cat) notFound()
  const posts = getPostsByCategory(slug)

  return (
    <div className="min-h-full flex flex-col">
      <BlogHeader />

      {/* 카테고리 색 히어로 */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${cat.from}, ${cat.to})` }}>
        <span className="pointer-events-none absolute -right-4 -top-4 text-[7rem] opacity-15 select-none">{cat.icon}</span>
        <div className="max-w-3xl mx-auto px-4 py-10 sm:py-12 relative">
          <nav className="text-sm text-white/70 mb-3">
            <Link href="/blog" className="hover:text-white">블로그</Link>
            <span className="mx-1.5">›</span>
            <span className="text-white/90">{cat.label}</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
            {cat.icon} {cat.label}
          </h1>
          <p className="text-white/75 mt-2 leading-relaxed">{cat.blurb}</p>
        </div>
      </div>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
          {posts.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {posts.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          ) : (
            <p className="text-[#64748b]">아직 이 분류에 글이 없어요.</p>
          )}

          {/* 다른 카테고리 */}
          <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-[#e2e8f0]">
            {CATEGORIES.filter((c) => c.slug !== slug).map((c) => (
              <Link
                key={c.slug}
                href={`/blog/category/${c.slug}`}
                className="text-sm font-semibold text-[#1e3a5f] bg-[#eef2f7] hover:bg-[#e2e8f0] rounded-full px-3.5 py-1.5 transition-colors"
              >
                {c.label}
              </Link>
            ))}
          </div>

          <section className="mb-10 mt-10">
            <BlogCTA />
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
