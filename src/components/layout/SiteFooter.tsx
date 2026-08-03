import Link from 'next/link'
import { BUSINESS, biz } from '@/lib/businessInfo'

// 전자상거래법 표시의무 + PG 심사를 위한 공통 푸터.
// 사업자 정보와 약관/정책 링크를 모든 페이지 하단에 노출한다.
export default function SiteFooter() {
  return (
    <footer className="bg-[#080f1e] text-white/40 text-xs">
      <div className="max-w-6xl mx-auto px-4 py-7">
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3 font-semibold text-white/70">
          <Link href="/guides" className="inline-block py-1.5 hover:text-white transition-colors">학습 자료 모음</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/exam-info" className="inline-block py-1.5 hover:text-white transition-colors">한국실용글쓰기 시험정보</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/kbs-korean" className="inline-block py-1.5 hover:text-white transition-colors">KBS한국어능력시험 정보</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/exam-compare" className="inline-block py-1.5 hover:text-white transition-colors">실용글쓰기·KBS 비교</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/essay-guide" className="inline-block py-1.5 hover:text-white transition-colors">서술형 공략</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/manuscript-guide" className="inline-block py-1.5 hover:text-white transition-colors">원고지 작성법</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/spelling" className="inline-block py-1.5 hover:text-white transition-colors">자주 틀리는 맞춤법</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/idioms" className="inline-block py-1.5 hover:text-white transition-colors">사자성어 모음</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/proverbs" className="inline-block py-1.5 hover:text-white transition-colors">속담 모음</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/expressions" className="inline-block py-1.5 hover:text-white transition-colors">관용구 모음</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/refined-words" className="inline-block py-1.5 hover:text-white transition-colors">순화어 모음</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/honorifics" className="inline-block py-1.5 hover:text-white transition-colors">높임법</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/standard-words" className="inline-block py-1.5 hover:text-white transition-colors">표준어</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/loanword-spelling" className="inline-block py-1.5 hover:text-white transition-colors">외래어 표기법</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/business-writing" className="inline-block py-1.5 hover:text-white transition-colors">공문서·이메일 예시</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/word-counter" className="inline-block py-1.5 hover:text-white transition-colors">글자수 세기</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/blog" className="inline-block py-1.5 hover:text-white transition-colors">독학 블로그</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/cbt" className="inline-block py-1.5 hover:text-white transition-colors">무료 CBT 모의고사</Link>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 font-semibold text-white/70">
          <Link href="/terms" className="inline-block py-1.5 hover:text-white transition-colors">이용약관</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/privacy" className="inline-block py-1.5 hover:text-white transition-colors">개인정보처리방침</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/refund" className="inline-block py-1.5 hover:text-white transition-colors">취소·환불 정책</Link>
          <span className="py-1.5 text-white/20">·</span>
          <Link href="/support" className="inline-block py-1.5 hover:text-white transition-colors">고객센터</Link>
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
          <p>전화: {biz(BUSINESS.phone)}</p>
          <p>이메일: {biz(BUSINESS.email)}</p>
        </div>

        <p className="mt-4 max-w-3xl text-white/30 leading-relaxed">
          본 서비스는 한국실용글쓰기 자격시험 대비를 돕는 <b className="text-white/50">비공식 사설 학습 서비스</b>로,
          시험 시행·주관 기관과 제휴·후원·인증 관계가 없습니다. 모든 문제·지문·자료·해설·모범답안은 시험 유형을
          참고해 자체 제작한 오리지널 콘텐츠이며, 기출문제를 복제하지 않습니다.
          <b className="text-white/50"> 이 모든 콘텐츠의 저작권은 운영자(만물아들)에게 단독으로 귀속되며, 무단 복제·캡처·배포·전송을 금합니다.</b>
          ‘한국실용글쓰기’ 등 시험 명칭의 권리는 각 권리자에게 있습니다.
        </p>
        <p className="mt-3 text-white/25">
          © {BUSINESS.serviceName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
