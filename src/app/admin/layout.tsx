// 최상위 admin 레이아웃은 통과용.
// 실제 권한 검증은 (protected)/layout.tsx 에서 하고,
// /admin/login 은 검증 없이 접근 가능해야 하므로 여기서는 children만 렌더한다.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
