import type { MetadataRoute } from 'next'
import { TRIAL_TOPICS } from '@/lib/trialTopics'
import { getAllPosts, CATEGORIES } from '@/lib/blog'

const SITE_URL = 'https://kptest.cloud'

// 검색엔진에 노출할 공개 페이지(로그인 필요 페이지는 제외).
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/try', ...TRIAL_TOPICS.map(t => `/try/${t.slug}`), '/word-counter', '/exam-info', '/kbs-korean', '/spelling', '/business-writing', '/essay-guide', '/manuscript-guide', '/exam-compare', '/idioms', '/proverbs', '/expressions', '/refined-words', '/honorifics', '/standard-words', '/loanword-spelling', '/guides', '/essay-scoring', '/blog', '/subscribe', '/event/blog-review', '/login', '/signup', '/terms', '/privacy', '/refund', '/support']
  // 무료 도구·시험정보·맞춤법·문서작성·서술형공략·원고지작성법·시험비교·사자성어·블로그(검색 유입 자석) → 색인 우선순위 높게
  const high = new Set(['', '/try', '/word-counter', '/exam-info', '/kbs-korean', '/spelling', '/business-writing', '/essay-guide', '/manuscript-guide', '/exam-compare', '/idioms', '/proverbs', '/expressions', '/refined-words', '/honorifics', '/standard-words', '/loanword-spelling', '/guides', '/blog'])
  const posts = getAllPosts()
  // 글이 하나 올라오면 목록·카테고리도 실제로 바뀐다 → 최신 글 날짜가 이들의 진짜 lastmod.
  const newestPostDate = posts[0]?.date ? new Date(posts[0].date) : undefined

  // 정적 페이지엔 lastModified를 넣지 않는다. 빌드할 때마다 '오늘 바뀜'으로 찍히면
  // 크롤러는 그 신호를 신뢰하지 않고 통째로 무시한다 — 거짓 신호보다 없는 편이 낫다.
  const staticEntries: MetadataRoute.Sitemap = routes.map(path => ({
    url: `${SITE_URL}${path}`,
    ...(path === '/blog' && newestPostDate ? { lastModified: newestPostDate } : {}),
    changeFrequency: high.has(path) ? 'daily' : 'monthly',
    priority: path === '' ? 1 : high.has(path) ? 0.9 : 0.6,
  }))

  // 블로그 글 + 카테고리 페이지(글이 늘면 사이트맵도 자동으로 늘어남)
  const postEntries: MetadataRoute.Sitemap = posts.map(p => ({
    url: `${SITE_URL}/blog/${encodeURIComponent(p.slug)}`,
    ...(p.date ? { lastModified: new Date(p.date) } : {}),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))
  const catEntries: MetadataRoute.Sitemap = CATEGORIES.map(c => {
    const newestInCat = posts.find(p => p.category === c.slug)?.date
    return {
      url: `${SITE_URL}/blog/category/${c.slug}`,
      ...(newestInCat ? { lastModified: new Date(newestInCat) } : {}),
      changeFrequency: 'weekly',
      priority: 0.6,
    }
  })

  return [...staticEntries, ...postEntries, ...catEntries]
}
