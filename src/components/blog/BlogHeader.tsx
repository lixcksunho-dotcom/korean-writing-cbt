import Link from 'next/link'
import LogoGlyph from '@/components/layout/LogoGlyph'

// 블로그 페이지 공통 헤더(자료 페이지 헤더와 동일한 형태).
export default function BlogHeader() {
  return (
    <header className="border-b border-[#e2e8f0] bg-white">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/blog" className="flex items-center gap-2 py-2">
          <LogoGlyph className="h-7 w-7" />
          <span className="font-black text-[#1e3a5f]">실글패스 블로그</span>
        </Link>
        <Link
          href="/cbt"
          className="py-3 text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f] transition-colors"
        >
          무료 CBT 모의고사 →
        </Link>
      </div>
    </header>
  )
}
