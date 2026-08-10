'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RotateCcw, Home, AlertTriangle, BookOpen, Newspaper } from 'lucide-react'

// 공개 면(학습자료·블로그·법적 고지·로그인) 오류 경계.
// 여기가 없으면 global-error.tsx까지 올라가는데, 그건 html째로 갈아 끼우는 최후 방어선이라
// 사이트 안 어디로도 갈 수 없는 화면이 된다. 검색으로 처음 들어온 사람에게는 그게 곧 이탈이다.
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[page-error]', error?.digest, error?.message)

    // 콘솔은 브라우저에만 남는다 — 운영자가 볼 수 있는 곳으로도 보낸다.
    // 실패해도 무시한다(오류 화면이 또 터지면 안 된다).
    fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        digest: error?.digest,
        message: error?.message,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
      }),
      keepalive: true,
    }).catch(() => {})
  }, [error])

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.08)] p-8 sm:p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="text-xl font-black text-[#0f172a] mb-2">일시적인 오류가 발생했어요</h1>
        <p className="text-[#475569] text-sm mb-7 leading-relaxed">
          잠깐 문제가 생겼어요. 대부분 <b>다시 시도</b>하면 정상적으로 열려요.<br />
          계속 같은 화면이면 아래 다른 자료를 먼저 둘러보셔도 좋아요.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => reset()}
            className="w-full btn-gold flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-sm"
          >
            <RotateCcw className="h-4 w-4" /> 다시 시도
          </button>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <Link href="/" className="flex flex-col items-center gap-1 py-3 rounded-xl border border-[#e2e8f0] text-xs text-[#475569] hover:bg-[#f8fafc] transition-colors">
              <Home className="h-4 w-4" /> 홈
            </Link>
            <Link href="/guides" className="flex flex-col items-center gap-1 py-3 rounded-xl border border-[#e2e8f0] text-xs text-[#475569] hover:bg-[#f8fafc] transition-colors">
              <BookOpen className="h-4 w-4" /> 학습자료
            </Link>
            <Link href="/blog" className="flex flex-col items-center gap-1 py-3 rounded-xl border border-[#e2e8f0] text-xs text-[#475569] hover:bg-[#f8fafc] transition-colors">
              <Newspaper className="h-4 w-4" /> 블로그
            </Link>
          </div>
        </div>
        {error?.digest && (
          <p className="text-xs text-[#64748b] mt-5">오류코드: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
