import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "한국실용글쓰기 CBT",
  description: "한국실용글쓰기 자격증 CBT 문제풀기 & 원고지 AI 채점/첨삭",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
