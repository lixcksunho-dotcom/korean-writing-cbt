import type { Metadata } from "next";
import "./globals.css";
import Analytics from "@/components/analytics/Analytics";

const SITE_URL = "https://kptest.cloud";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "한국실용글쓰기 CBT — 기출 문제풀기 & 원고지 AI 첨삭",
    template: "%s | 한국실용글쓰기 CBT",
  },
  description:
    "한국실용글쓰기 자격증을 CBT로 준비하세요. 기출 유형 모의고사 무료 풀이, 서술형·원고지 답안 AI 채점·첨삭, 맞춤법·외래어·문장호응 유형별 집중 연습까지. 합격 전까지 5,500원 1회 결제로 30일 무제한.",
  keywords: [
    "한국실용글쓰기", "실용글쓰기 자격증", "실용글쓰기 기출", "실용글쓰기 cbt",
    "실용글쓰기 모의고사", "원고지 첨삭", "서술형 AI 채점", "맞춤법 연습",
    "공무원 가산점 자격증", "실용글쓰기 독학",
  ],
  applicationName: "한국실용글쓰기 CBT",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "한국실용글쓰기 CBT",
    title: "한국실용글쓰기 CBT — 기출 문제풀기 & 원고지 AI 첨삭",
    description:
      "기출 유형 모의고사 무료 풀이 + 서술형·원고지 AI 채점·첨삭. 5,500원 1회 결제로 30일 무제한.",
  },
  twitter: {
    card: "summary_large_image",
    title: "한국실용글쓰기 CBT",
    description: "기출 모의고사 무료 + 원고지 AI 첨삭. 합격까지 함께.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
