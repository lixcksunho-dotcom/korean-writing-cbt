import Link from 'next/link'
import { BUSINESS, biz } from '@/lib/businessInfo'

// 전자상거래법 표시의무 + PG 심사를 위한 공통 푸터.
// 사업자 정보와 약관/정책 링크를 모든 페이지 하단에 노출한다.
export default function SiteFooter() {
  return (
    <footer className="bg-[#080f1e] text-white/40 text-xs">
      <div className="max-w-6xl mx-auto px-4 py-7">
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 font-semibold text-white/70">
          <Link href="/terms" className="hover:text-white transition-colors">이용약관</Link>
          <span className="text-white/20">·</span>
          <Link href="/privacy" className="hover:text-white transition-colors">개인정보처리방침</Link>
          <span className="text-white/20">·</span>
          <Link href="/refund" className="hover:text-white transition-colors">취소·환불 정책</Link>
        </div>

        <div className="space-y-1 leading-relaxed">
          <p className="text-white/60 font-semibold">{BUSINESS.serviceName}</p>
          <p>
            상호: {biz(BUSINESS.companyName)} · 대표자: {biz(BUSINESS.ceoName)} ·
            사업자등록번호: {biz(BUSINESS.businessNumber)}
          </p>
          <p>
            통신판매업 신고번호: {biz(BUSINESS.mailOrderNumber)}
          </p>
          <p>주소: {biz(BUSINESS.address)}</p>
          <p>
            고객센터: {biz(BUSINESS.email)}
            {BUSINESS.phone ? ` · ${BUSINESS.phone}` : ''}
          </p>
        </div>

        <p className="mt-4 text-white/25">
          © {BUSINESS.serviceName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
