import Link from 'next/link'
import { Gift } from 'lucide-react'
import { PROMO_CAMPAIGNS, promoState } from '@/lib/promoCampaign'
import { serverNow } from '@/lib/serverNow'

// 블로그 글 아래에 '지금 하는 행사'를 띄운다.
//
// 왜: 홍보 글을 읽고 마음이 움직인 사람은 그 자리에서 다음 걸음을 밟아야 한다.
// 행사가 끝나면 저절로 사라지고, 새 행사를 promoCampaign.ts에 넣으면 저절로 뜬다 —
// 글마다 손으로 문구를 넣고 지우면 반드시 지난 행사가 남아 사람을 헛걸음시킨다.
export default async function PromoBanner() {
  const now = await serverNow()
  const live = PROMO_CAMPAIGNS.filter(c => promoState(c, now) === '진행 중')
  if (live.length === 0) return null
  const c = live[0]

  return (
    <div className="mt-8 rounded-xl border border-[#e2e8f0] bg-white p-5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Gift className="h-4 w-4 text-[#d97706]" aria-hidden="true" />
        <p className="text-sm font-bold text-[#0f172a]">지금 이용권 {c.days}일 무료 행사 중</p>
      </div>
      <p className="text-sm text-[#475569] leading-relaxed">
        아래 코드를 이용권 화면에 넣으면 전 회차와 영역별 약점 분석이 {c.days}일 동안 열립니다.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <code className="rounded-xl border border-dashed border-[#d97706]/40 bg-[#d97706]/5 px-3 py-2 font-mono text-base font-black tracking-widest text-[#d97706]">
          {c.code}
        </code>
        <Link href="/subscribe" className="btn-gold inline-flex items-center px-5 py-2.5 text-sm">
          코드 쓰러 가기
        </Link>
      </div>
      <p className="mt-2.5 text-xs text-[#64748b]">
        선착순 {c.maxUses}명 · {new Date(c.endsAt).toLocaleDateString('ko-KR')}까지
      </p>
    </div>
  )
}
