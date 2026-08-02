import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import BlogHeader from '@/components/blog/BlogHeader'
import BlogCTA from '@/components/blog/BlogCTA'
import PostCard from '@/components/blog/PostCard'
import RelatedStudyPages from '@/components/blog/RelatedStudyPages'
import TopicQuiz from '@/components/study/TopicQuiz'
import { quizTopicForPost } from '@/components/study/quizTopicForPost'
import SiteFooter from '@/components/layout/SiteFooter'
import { getAllPosts, getPost, getRelated, formatDate, catTheme } from '@/lib/blog'

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

// 글 목록은 빌드 시점에 src/content/blog/*.json 으로 확정된다. 목록에 없는 슬러그를
// 굳이 요청 때 렌더할 이유가 없고, 실제로 한글 슬러그로 없는 글을 열면 프로덕션에서
// 404가 아니라 500이 나왔다(로컬에서는 재현되지 않는 서버리스 환경 문제).
// 500은 검색엔진에 '서버 고장, 다시 와라'로 읽혀 404보다 나쁘다.
export const dynamicParams = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: '글을 찾을 수 없어요' }
  return {
    title: `${post.title} — 실글패스 블로그`,
    description: post.excerpt,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
      type: 'article',
      // 카카오톡·페이스북 공유 시 미리보기 카드에 뜨는 브랜드 이미지(없으면 밋밋한 링크만 뜬다).
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: ['/opengraph-image.png'],
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const related = getRelated(post, 4)
  const t = catTheme(post.category)
  const quizTopic = quizTopicForPost(post.category, post.slug)

  // 검색 리치결과용 구조화 데이터(자체 도메인이라 script가 유지된다 — 워드프레스와 달리 안전)
  // BlogPosting + BreadcrumbList 를 한 그래프로 — 검색결과에 글 정보와 경로(홈>블로그>카테고리)가 함께 노출된다.
  const postUrl = `https://kptest.cloud/blog/${post.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        datePublished: post.date,
        dateModified: post.date,
        author: { '@type': 'Organization', name: '실글패스' },
        publisher: { '@type': 'Organization', name: '실글패스' },
        mainEntityOfPage: postUrl,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: 'https://kptest.cloud/' },
          { '@type': 'ListItem', position: 2, name: '블로그', item: 'https://kptest.cloud/blog' },
          { '@type': 'ListItem', position: 3, name: post.categoryLabel, item: `https://kptest.cloud/blog/category/${post.category}` },
          { '@type': 'ListItem', position: 4, name: post.title, item: postUrl },
        ],
      },
    ],
  }

  return (
    <div className="min-h-full flex flex-col">
      <BlogHeader />

      <main className="flex-1">
        {/* 카테고리 색 그라디언트 히어로 — 글마다 designed 느낌 */}
        <div
          className="relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
        >
          <span className="pointer-events-none absolute -right-6 -top-6 text-[8rem] opacity-15 select-none">
            {t.icon}
          </span>
          <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
            <nav className="text-sm text-white/70 mb-4">
              <Link href="/blog" className="hover:text-white">블로그</Link>
              <span className="mx-1.5">›</span>
              <Link href={`/blog/category/${post.category}`} className="hover:text-white">
                {post.categoryLabel}
              </Link>
            </nav>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/90 bg-white/15 rounded-full px-3 py-1 backdrop-blur">
              {t.icon} {post.categoryLabel}
            </span>
            <h1 className="mt-3 text-[1.9rem] sm:text-[2.4rem] font-black text-white tracking-tight leading-tight drop-shadow-sm">
              {post.title}
            </h1>
            <p className="mt-3 text-sm text-white/70">{formatDate(post.date)}</p>
          </div>
        </div>

        <article className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
          {/* 리드(첫 문단)는 CSS에서 standfirst로 강조 · 본문 표는 컨테이너 안에서만 스크롤
              --cat: 카테고리 색을 본문 h2 왼쪽 바·표 헤더·리스트 마커에 반영 */}
          <div
            className="blog-body blog-body-scroll"
            style={{ '--cat': t.from } as CSSProperties}
            dangerouslySetInnerHTML={{ __html: post.body }}
          />

          {/* 태그 */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-[#e2e8f0]">
              {post.tags.map((t) => (
                <span key={t} className="text-xs text-[#64748b] bg-[#f1f5f9] rounded-full px-2.5 py-1">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-10">
            <BlogCTA path={post.ctaPath} label={post.ctaLabel} />
          </div>

          {/* 읽고 끝나지 않게 — 읽은 자리에서 바로 풀어보고 실전으로 잇는다.
              같은 카테고리 글을 여러 편 읽어도 매번 같은 문제가 나오지 않게 slug로 주제를 가른다. */}
          {quizTopic && <TopicQuiz topic={quizTopic} />}

          {/* 같은 주제의 학습자료 — 글로 들어온 사람을 무료 도구까지 데려간다 */}
          <RelatedStudyPages category={post.category} slug={post.slug} />

          {/* 관련 글 */}
          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-black text-[#0f172a] mb-4">함께 보면 좋은 글</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {related.map((p) => (
                  <PostCard key={p.slug} post={p} />
                ))}
              </div>
            </section>
          )}

          <div className="mt-10">
            <Link href="/blog" className="text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f]">
              ← 블로그 전체 글 보기
            </Link>
          </div>
        </article>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
