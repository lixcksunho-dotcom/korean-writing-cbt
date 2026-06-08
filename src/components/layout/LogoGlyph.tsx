// 실글패스 로고 글리프 — 원고지 한 칸 + 합격 체크(✓). currentColor 사용(보통 흰색 박스 위).
export default function LogoGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
      <path d="M12 4.2v15.6M4.2 12h15.6" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <path d="M7.4 12.4l3.1 3 6.1-6.7" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
