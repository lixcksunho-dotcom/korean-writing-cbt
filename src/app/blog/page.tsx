import type { Metadata } from 'next'
import Link from 'next/link'
import BlogHeader from '@/components/blog/BlogHeader'
import PostCard from '@/components/blog/PostCard'
import BlogCTA from '@/components/blog/BlogCTA'
import SiteFooter from '@/components/layout/SiteFooter'
import { getAllPosts, CATEGORIES } from '@/lib/blog'

export const metadata: Metadata = {
  title: '한국실용글쓰기 독학 블로그 — 시험 정보·공부법·맞춤법·서술형',
  description:
    '한국실용글쓰기 자격증을 혼자 준비하는 분들을 위한 블로그. 시험 일정·등급, 되/돼 같은 자주 틀리는 맞춤법, 서술형 700점 공략, 원고지·공문서 작성법까지 정확하게 정리했어요.',
  keywords: [
    '한국실용글쓰기', '실용글쓰기 독학', '실용글쓰기 공부법', '실용글쓰기 시험일정',
    '실용글쓰기 등급', '맞춤법 정리', '서술형 공략', '원고지 작성법',
  ],
  // 페이지에서 alternates를 지정하면 루트 레이아웃 것을 통째로 덮으므로 RSS 자동발견을 여기서도 준다.
  alternates: {
    canonical: '/blog',
    types: { 'application/rss+xml': 'https://kptest.cloud/rss.xml' },
  },
  openGraph: {
    title: '한국실용글쓰기 독학 블로그',
    description: '시험 정보·공부법·맞춤법·서술형 공략을 정확하게 정리한 독학 블로그.',
    url: '/blog',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()
  const byCat = new Map(CATEGORIES.map((c) => [c.slug, posts.filter((p) => p.category === c.slug)]))
  const featured = posts[0]
  const recent = posts.slice(1, 5)

  return (
    <div className="min-h-full flex flex-col">
      <BlogHeader />

      {/* 히어로 — 네이비 그라디언트 밴드 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f1f3d] via-[#1e3a5f] to-[#2d5488]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 relative">
          <p className="text-[#fbbf24] font-bold text-sm mb-2">실글패스 블로그</p>
          <h1 className="text-3xl sm:text-[2.6rem] font-black text-white tracking-tight leading-tight">
            한국실용글쓰기, 혼자서도<br className="hidden sm:block" /> 제대로 준비하는 법
          </h1>
          <p className="text-white/70 mt-4 leading-relaxed max-w-xl">
            시험 일정·등급부터 자주 틀리는 맞춤법, 서술형·원고지 작성법까지 —
            검색하다 막히던 것들을 정확하게 정리했어요.
          </p>
        </div>
      </div>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
          {/* 카테고리 칩 */}
          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.filter((c) => (byCat.get(c.slug)?.length ?? 0) > 0).map((c) => (
              <Link
                key={c.slug}
                href={`/blog/category/${c.slug}`}
                className="inline-flex items-center gap-1 text-sm font-semibold rounded-full px-3.5 py-2.5 transition-colors hover:brightness-95"
                style={{ background: c.tint, color: c.ink }}
              >
                {c.icon} {c.label} <span className="opacity-50">{byCat.get(c.slug)?.length}</span>
              </Link>
            ))}
          </div>

          {/* 최신 글 — 대표 1개 크게 + 최근 4개 */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-[#0f172a] mb-4">최신 글</h2>
            {featured && (
              <div className="mb-4">
                <PostCard post={featured} featured />
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              {recent.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </section>

          {/* 카테고리별 */}
          {CATEGORIES.map((c) => {
            const list = byCat.get(c.slug) ?? []
            if (list.length === 0) return null
            return (
              <section key={c.slug} className="mb-10">
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-2xl font-black text-[#0f172a]">{c.label}</h2>
                  <Link
                    href={`/blog/category/${c.slug}`}
                    className="text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f]"
                  >
                    전체 보기 →
                  </Link>
                </div>
                <p className="text-sm text-[#64748b] mb-3">{c.blurb}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {list.slice(0, 4).map((p) => (
                    <PostCard key={p.slug} post={p} />
                  ))}
                </div>
              </section>
            )
          })}

          <section className="mb-10 mt-10">
            <BlogCTA />
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
