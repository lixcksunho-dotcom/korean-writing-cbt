import type { Metadata } from "next";

// 토큰이 있어야 의미가 있는 화면이라 검색에 실릴 이유가 없다.
// 화면 자체는 클라이언트 컴포넌트('use client')라 metadata를 내보낼 수 없어 레이아웃에 둔다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
