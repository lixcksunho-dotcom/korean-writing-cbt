import type { Metadata } from "next";
import "./globals.css";
import Analytics from "@/components/analytics/Analytics";
import TrafficTracker from "@/components/analytics/TrafficTracker";

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
  // RSS 자동발견(rel=alternate) — 리더·수집기가 /rss.xml 을 스스로 찾는다.
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": `${SITE_URL}/rss.xml` },
  },
  openGraph: {
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
  // 검색엔진 사이트 소유확인 — Vercel 환경변수에 코드만 넣으면 head에 자동 삽입.
  //  GOOGLE_SITE_VERIFICATION : 구글 서치콘솔 'HTML 태그' content 값
  //  NAVER_SITE_VERIFICATION  : 네이버 서치어드바이저 'HTML 태그' content 값
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION }
      : {},
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
