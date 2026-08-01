import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

import Analytics from "@/components/analytics/Analytics";
import TrafficTracker from "@/components/analytics/TrafficTracker";

// next/font가 빌드 때 폰트를 받아 자체 호스팅한다 → googleapis·gstatic 왕복이 사라진다.
// preload는 끈다: 한글 서브셋은 통째로 수 MB라 preload하면 첫 로드에 전부 받아 버린다.
//   끄면 unicode-range 청크 방식이 유지돼 실제 쓰인 글자 조각만 받는다.
// adjustFontFallback도 끈다: 이게 만드는 보정 대체 폰트는 local(Arial) 기준인데
//   Arial엔 한글 글리프가 없어 한글은 그 다음 폰트로 넘어간다 → 보정이 닿지 않는다.
//   실측(각 3회)에서도 켬/끔의 CLS가 사실상 동일해, 효과 없는 @font-face를 빼는 쪽을 택한다.
const notoSansKR = Noto_Sans_KR({
  weight: ["400", "500", "600", "700", "900"],
  preload: false,
  adjustFontFallback: false,
  // swap 유지 = 지금 프로덕션과 같은 동작. optional로 바꾸면 실측상 CLS가 0.05~0.10 → 0이 되지만,
  // 느린 회선 첫 방문에서 본문이 시스템 한글 폰트로 그려진다(브랜드 변화) — 결정 사항이라 그대로 둔다.
  display: "swap",
  variable: "--font-noto-sans-kr",
});

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
    <html lang="ko" className={`h-full ${notoSansKR.variable}`}>
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
