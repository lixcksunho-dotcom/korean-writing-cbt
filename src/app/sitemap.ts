import type { MetadataRoute } from 'next'
import { getAllPosts, CATEGORIES } from '@/lib/blog'

const SITE_URL = 'https://kptest.cloud'

// 검색엔진에 노출할 공개 페이지(로그인 필요 페이지는 제외).
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/word-counter', '/exam-info', '/kbs-korean', '/spelling', '/business-writing', '/essay-guide', '/manuscript-guide', '/exam-compare', '/idioms', '/proverbs', '/expressions', '/refined-words', '/honorifics', '/standard-words', '/loanword-spelling', '/guides', '/blog', '/login', '/signup', '/terms', '/privacy', '/refund', '/support']
  // 무료 도구·시험정보·맞춤법·문서작성·서술형공략·원고지작성법·시험비교·사자성어·블로그(검색 유입 자석) → 색인 우선순위 높게
  const high = new Set(['', '/word-counter', '/exam-info', '/kbs-korean', '/spelling', '/business-writing', '/essay-guide', '/manuscript-guide', '/exam-compare', '/idioms', '/proverbs', '/expressions', '/refined-words', '/honorifics', '/standard-words', '/loanword-spelling', '/guides', '/blog'])
  const lastModified = new Date()

  const staticEntries: MetadataRoute.Sitemap = routes.map(path => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: high.has(path) ? 'daily' : 'monthly',
    priority: path === '' ? 1 : high.has(path) ? 0.9 : 0.6,
  }))

  // 블로그 글 + 카테고리 페이지(글이 늘면 사이트맵도 자동으로 늘어남)
  const postEntries: MetadataRoute.Sitemap = getAllPosts().map(p => ({
    url: `${SITE_URL}/blog/${encodeURIComponent(p.slug)}`,
    lastModified: p.date ? new Date(p.date) : lastModified,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))
  const catEntries: MetadataRoute.Sitemap = CATEGORIES.map(c => ({
    url: `${SITE_URL}/blog/category/${c.slug}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticEntries, ...postEntries, ...catEntries]
}
