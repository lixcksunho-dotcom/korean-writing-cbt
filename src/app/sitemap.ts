import type { MetadataRoute } from 'next'

const SITE_URL = 'https://kptest.cloud'

// 검색엔진에 노출할 공개 페이지(로그인 필요 페이지는 제외).
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/word-counter', '/exam-info', '/kbs-korean', '/spelling', '/business-writing', '/essay-guide', '/login', '/signup', '/terms', '/privacy', '/refund', '/support']
  // 무료 도구·시험정보·맞춤법·문서작성·서술형공략(검색 유입 자석) → 색인 우선순위 높게
  const high = new Set(['', '/word-counter', '/exam-info', '/kbs-korean', '/spelling', '/business-writing', '/essay-guide'])
  const lastModified = new Date()
  return routes.map(path => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: high.has(path) ? 'daily' : 'monthly',
    priority: path === '' ? 1 : high.has(path) ? 0.9 : 0.6,
  }))
}
