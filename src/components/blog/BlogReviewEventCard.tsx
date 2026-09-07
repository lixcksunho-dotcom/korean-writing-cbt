'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PenLine, ArrowRight } from 'lucide-react'
import { MIN_CHARS, MIN_IMAGES, REWARD_DAYS } from '@/lib/blogPromoRules'

// 블로그 후기 이벤트로 가는 문. 글을 끝까지 읽은 사람(블로그 글 아래)과 로그인한 사람(대시보드)이 만난다.
//
// 왜 필요한가: 이벤트 페이지는 있는데 들어가는 길이 구독 화면의 작은 링크 하나뿐이었다 —
// 2026-09-07 기준 참여 0건. 첫 화면 팝업은 정책상 꺼져 있다(실제 통과 사례가 나올 때까지).
// 조건(사진 N장·글자 N자)을 여기서부터 말해 준다 — 들어가서야 알면 그냥 나간다.
//
// 자리 수는 브라우저에서 /api/promo/quota 로 읽는다. 블로그 글은 정적으로 만들어지므로 서버에서
// 세면 빌드 시점 숫자가 굳어 마감된 뒤에도 카드가 남는다. 마감이면 카드 자체를 지운다.
// 세기에 실패하면 숫자만 비운다 — 홍보가 서버 문제로 번지면 안 된다.
export default function BlogReviewEventCard() {
  const [left, setLeft] = useState<number | null>(null)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/promo/quota', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((q: { left?: number; total?: number; closed?: boolean } | null) => {
        if (!alive || !q) return
        if (q.closed) setClosed(true)
        // total 0 은 API 가 세지 못했을 때의 값(left 1 로 열어 둠) — 그 숫자는 안 보여 준다
        else if (typeof q.left === 'number' && q.total) setLeft(q.left)
      })
      .catch(() => { /* 숫자 없이 그대로 둔다 */ })
    return () => { alive = false }
  }, [])

  if (closed) return null

  return (
    <Link
      href="/event/blog-review"
      className="group mt-4 flex items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_4px_16px_rgba(15,31,61,0.06)] transition-colors hover:border-[#cbd5e1]"
    >
      <div className="rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-3 shadow-lg shadow-emerald-500/20">
        <PenLine className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#0f172a]">
          블로그에 후기를 쓰면 이용권 {REWARD_DAYS}일을 드려요
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#64748b]">
          사진 {MIN_IMAGES}장 · {MIN_CHARS.toLocaleString('ko-KR')}자 이상 · 광고 표시 한 줄. 조건을 채우면 자동으로 바로 지급됩니다.
          {left !== null && <span className="ml-1 font-semibold text-emerald-700">선착순 {left}자리 남음</span>}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#64748b] transition-transform group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  )
}
