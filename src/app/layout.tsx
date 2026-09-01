import type { Metadata } from "next";
import "./globals.css";

import Analytics from "@/components/analytics/Analytics";
import TrafficTracker from "@/components/analytics/TrafficTracker";

// 웹폰트(Noto Sans KR)를 걷어내고 시스템 한글 글꼴로 그린다. 글꼴 지정은 globals.css.
//
// 왜 뺐는지 — 실측 결과가 셋 다 나쁜 쪽이었다(2026-08-03, 프로덕션):
//  1. 느린 회선(1.6Mbps·CPU 4배)에서 뒤늦게 적용되며 CLS 0.167(/exam-info)·0.123(/blog).
//     한글은 unicode-range 서브셋이 621개라 display:optional의 차단 구간이 서브셋마다
//     따로 돌고, 늦게 도착한 조각이 하나씩 적용되며 문단이 계속 다시 접힌다.
//  2. 빠른 회선에서는 아예 적용되지 않았다(글리프 집계: Malgun Gothic 48% / Arial 52%).
//     즉 회선 속도에 따라 글꼴이 달라져 타이포그래피가 일정하지 않았다.
//  3. woff2 요청을 막고 재면 같은 조건에서 CLS 0.0000 — 밀림의 원인이 폰트임이 확정된다.
//
// 안드로이드의 Noto Sans CJK KR은 Noto Sans KR과 사실상 같은 디자인이고, iOS는 Apple SD
// Gothic Neo, 윈도우는 맑은 고딕이라 시스템 글꼴만으로도 한글 본문 품질이 떨어지지 않는다.
const SITE_URL = "https://kptest.cloud";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "실글패스 — 한국실용글쓰기 자격 대비 CBT & 원고지 AI 첨삭",
    template: "%s | 실글패스",
  },
  description:
    "한국실용글쓰기 자격증을 CBT로 준비하세요. 기출 유형 모의고사 무료 풀이, 서술형·원고지 답안 AI 채점·첨삭, 맞춤법·외래어·문장호응 유형별 집중 연습까지. 합격 전까지 5,500원 1회 결제로 30일 무제한.",
  keywords: [
    "실글패스", "한국실용글쓰기", "실용글쓰기 자격증", "실용글쓰기 기출", "실용글쓰기 cbt",
    "실용글쓰기 모의고사", "원고지 첨삭", "서술형 AI 채점", "맞춤법 연습",
    "공무원 가산점 자격증", "실용글쓰기 독학",
    "KBS한국어능력시험", "국어능력시험 모의고사", "국어 자격증 CBT",
  ],
  applicationName: "실글패스",
  // 홈 화면에 추가했을 때 앱처럼 열리게 하는 설정(src/app/manifest.ts).
  // iOS는 매니페스트만으로는 부족해 아래 apple 항목이 필요하다.
  appleWebApp: { capable: true, title: "실글패스", statusBarStyle: "black-translucent" },
  // RSS 자동발견(rel=alternate) — 리더·수집기가 /rss.xml 을 스스로 찾는다.
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": `${SITE_URL}/rss.xml` },
  },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "실글패스",
    title: "실글패스 — 한국실용글쓰기 자격 대비 CBT & 원고지 AI 첨삭",
    description:
      "기출 유형 모의고사 무료 풀이 + 서술형·원고지 AI 채점·첨삭. 5,500원 1회 결제로 30일 무제한.",
  },
  twitter: {
    card: "summary_large_image",
    title: "실글패스",
    description: "기출 모의고사 무료 + 원고지 AI 첨삭. 합격까지 함께.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // 검색엔진 사이트 소유확인.
  //  GOOGLE_SITE_VERIFICATION : 구글 서치콘솔 'HTML 태그' content 값(Vercel 환경변수)
  //  네이버는 코드를 직접 박는다 — 환경변수에 남아 있던 옛 코드가 새로 발급받은 것과
  //  달라 소유확인이 계속 실패했다. 이 값은 어차피 head로 공개되는 식별자라 비밀이 아니고,
  //  코드에 두면 대시보드 상태와 어긋날 일이 없다.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: { "naver-site-verification": "65a7f723fbae706bec6ae2f50ed82fccdc462c9b" },
  },
};

// 검색 리치결과용 구조화데이터(JSON-LD) — 조직·사이트·강좌(가격) 노출.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "실글패스",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "실글패스",
      inLanguage: "ko-KR",
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "Course",
      name: "한국실용글쓰기 자격 대비 CBT",
      description:
        "한국실용글쓰기 자격증 대비 CBT. 기출 유형 모의고사, 서술형·원고지 AI 채점·첨삭, 맞춤법·외래어 유형별 집중 연습.",
      provider: { "@id": `${SITE_URL}/#org` },
      offers: {
        "@type": "Offer",
        price: "5500",
        priceCurrency: "KRW",
        category: "30일 무제한 이용권",
        url: `${SITE_URL}/subscribe`,
      },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "online",
        courseWorkload: "PT30D",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <head>
        {/* 프리텐다드(동적 서브셋) — 자매 서비스와 같은 방식: swap + 폴백 메트릭 보정.
            느린 회선 CLS는 자매 서비스에서 0.055로 실측 확인(기준 0.1). */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {children}
        <Analytics />
        <TrafficTracker />
      </body>
    </html>
  );
}
