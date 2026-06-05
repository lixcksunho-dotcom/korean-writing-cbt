import Link from 'next/link'
import SiteFooter from '@/components/layout/SiteFooter'
import { BUSINESS } from '@/lib/businessInfo'

// 공개(로그인 불필요) 법적 고지 영역. PG 심사 크롤러가 접근 가능해야 한다.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="bg-white border-b border-[#e2e8f0]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="font-black text-[#0f172a] text-sm tracking-tight">
            {BUSINESS.serviceName}
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
        <article className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.06)] p-8 sm:p-10">
          {children}
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
