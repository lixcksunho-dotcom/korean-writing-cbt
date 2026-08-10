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
      // '/subscribe'(상품·가격·환불 안내)는 비로그인 공개 페이지이자 고의도 검색 유입처라 색인시킨다.
      //   대신 결제 이후·인증 필요한 하위 경로만 개별로 막는다(접두사로 통째로 막으면 안내까지 빠진다).
      disallow: [
        '/dashboard', '/cbt', '/practice', '/manuscript',
        '/subscribe/success', '/subscribe/history', '/subscribe/fail',
        '/admin', '/auth',
        // 비밀번호 재설정은 토큰이 있어야 의미가 있는 화면이다. 크롤러가 열면
        // '링크가 만료됐어요'만 보이므로 그게 검색 결과에 실린다.
        '/forgot-password', '/reset-password',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
