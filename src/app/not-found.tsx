import Link from 'next/link'
import type { Metadata } from 'next'
import LogoGlyph from '@/components/layout/LogoGlyph'

// 없는 주소로 들어왔을 때. 두지 않으면 Next 기본 화면("404 This page could not be found.")이
// 나오는데, 한국어 서비스에 영문 한 줄만 뜨고 돌아갈 링크도 없어서 그냥 나가게 된다.
// 글 슬러그가 전부 한글이라 오타·오래된 링크가 실제로 여기로 온다.
export const metadata: Metadata = {
  title: '페이지를 찾을 수 없어요',
  robots: { index: false, follow: true },
}

// 어디로 잘못 들어왔든 다음에 갈 만한 곳
const NEXT_STOPS = [
  { href: '/', label: '홈으로', desc: '실글패스 소개와 시작하기' },
  { href: '/cbt', label: '무료 CBT 모의고사', desc: '기출 유형 문항 바로 풀기' },
  { href: '/guides', label: '학습 자료 모음', desc: '맞춤법·사자성어·원고지 작성법' },
  { href: '/blog', label: '독학 블로그', desc: '공부법·시험 정보 글' },
]

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="border-b border-[#e2e8f0] bg-white">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 py-2">
            <LogoGlyph className="h-7 w-7" />
            <span className="font-black text-[#1e3a5f]">실글패스</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-16">
        <p className="text-sm font-bold text-[#b45309]">404</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black text-[#0f172a] leading-tight">
          찾으시는 페이지가 없어요
        </h1>
        <p className="mt-3 text-[#475569] leading-relaxed">
          주소가 바뀌었거나 오타가 있는 것 같아요. 아래에서 이어서 보세요.
        </p>

        <ul className="mt-8 grid sm:grid-cols-2 gap-3">
          {NEXT_STOPS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="block rounded-2xl border border-[#e2e8f0] bg-white px-5 py-4 hover:border-[#cbd5e1] transition-colors"
              >
                <span className="block font-bold text-[#1e3a5f]">{s.label} →</span>
                <span className="block mt-1 text-sm text-[#64748b]">{s.desc}</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm text-[#64748b]">
          계속 같은 화면이 나오면{' '}
          <Link href="/support" className="underline font-semibold hover:text-[#1e3a5f]">
            고객센터
          </Link>
          로 알려 주세요.
        </p>
      </main>
    </div>
  )
}
