import type { MetadataRoute } from 'next'

const SITE_URL = 'https://kptest.cloud'

// 검색엔진에 노출할 공개 페이지(로그인 필요 페이지는 제외).
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/login', '/signup', '/terms', '/privacy', '/refund', '/support']
  return routes.map(path => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === '' ? 'daily' : 'monthly',
    priority: path === '' ? 1 : 0.6,
  }))
}
