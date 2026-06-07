'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

// 성적 공유 — Web Share API 지원 시 공유 시트, 아니면 클립보드 복사.
export default function PaperShareButton({ round, scaled, tier }: { round: number; scaled: number; tier: string }) {
  const [copied, setCopied] = useState(false)
  const text = `한국실용글쓰기 모의고사 ${round}회 — 1000점 환산 ${scaled}점${tier !== '미달' ? ` (${tier} 합격권)` : ''}! 나도 무료로 풀어보기 👉`
  const url = 'https://kptest.cloud'

  async function share() {
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> }
    if (nav.share) {
      try { await nav.share({ title: '한국실용글쓰기 CBT', text, url }); return } catch { /* 취소 등 */ }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* noop */ }
  }

  return (
    <button
      onClick={share}
      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-white/30 text-white font-bold text-sm hover:bg-white/10 transition-colors"
    >
      {copied ? <><Check className="h-4 w-4" /> 복사됨!</> : <><Share2 className="h-4 w-4" /> 성적 공유</>}
    </button>
  )
}
