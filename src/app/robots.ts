import type { MetadataRoute } from 'next'

const SITE_URL = 'https://kptest.cloud'

// 공개 페이지는 색인 허용, 로그인 이후 영역은 색인 제외.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/cbt', '/practice', '/manuscript', '/subscribe', '/admin', '/auth'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
