import Link from 'next/link'
import BrandLogo from '@/components/layout/BrandLogo'

// 블로그 페이지 공통 헤더(자료 페이지 헤더와 동일한 형태).
export default function BlogHeader() {
  return (
    <header className="border-b border-[#e2e8f0] bg-white">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/blog" className="flex items-center gap-2 py-2">
          <BrandLogo />
          <span className="hidden sm:inline text-sm text-[#64748b]">블로그</span>
        </Link>
        <Link
          href="/try"
          className="py-3 text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f] transition-colors"
        >
          <span className="hidden sm:inline">가입 없이 문제 풀어보기 →</span>
          <span className="sm:hidden">문제 풀기 →</span>
        </Link>
      </div>
    </header>
  )
}
