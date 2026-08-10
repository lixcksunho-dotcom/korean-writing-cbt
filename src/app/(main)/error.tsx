'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RotateCcw, Home, AlertTriangle } from 'lucide-react'

// (main) 영역 공통 에러 경계 — 서버/렌더 오류 시 영문 크래시 대신 친절한 한글 화면 + 재시도.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // 콘솔/모니터링에 남겨 추후 원인 추적(digest로 서버로그 매칭 가능)
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
    <div className="max-w-md mx-auto py-16 text-center">
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.08)] p-10">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="text-xl font-black text-[#0f172a] mb-2">일시적인 오류가 발생했어요</h1>
        <p className="text-[#64748b] text-sm mb-7 leading-relaxed">
          잠깐 문제가 생겼어요. 대부분 <b>다시 시도</b>하면 정상적으로 열려요.<br />
          계속 같은 화면이 나오면 잠시 후 다시 들어와 주세요.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => reset()}
            className="w-full btn-gold flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-sm"
          >
            <RotateCcw className="h-4 w-4" /> 다시 시도
          </button>
          <Link href="/" className="flex items-center justify-center gap-2 text-sm text-[#64748b] hover:text-[#334155] transition-colors py-2">
            <Home className="h-4 w-4" /> 홈으로
          </Link>
        </div>
        {error?.digest && (
          <p className="text-xs text-[#64748b] mt-5">오류코드: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
