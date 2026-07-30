import type { MetadataRoute } from 'next'

const SITE_URL = 'https://kptest.cloud'

// 공개 페이지는 색인 허용, 로그인 이후 영역은 색인 제외.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // '/manuscript-guide'(공개 SEO 안내글)를 명시적으로 허용한다.
      //   disallow의 '/manuscript'는 접두사 매칭이라 그냥 두면 안내글까지 색인에서 빠진다.
      //   크롤러는 더 긴(구체적인) 규칙을 우선하므로 이 allow가 disallow를 이긴다.
      allow: ['/', '/manuscript-guide'],
      disallow: ['/dashboard', '/cbt', '/practice', '/manuscript', '/subscribe', '/admin', '/auth'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
