import Link from 'next/link'
import { BUSINESS, biz } from '@/lib/businessInfo'

// 전자상거래법 표시의무 + PG 심사를 위한 공통 푸터.
// 사업자 정보와 약관/정책 링크를 모든 페이지 하단에 노출한다.

// 학습자료로 가는 길. 휴대폰에서는 2열 격자로 세운다 — 19개를 가운뎃점으로 이어
// 붙이면 줄이 뒤엉켜 훑기 어렵고, 한 줄 높이가 28px이라 옆 링크가 눌린다.
// 넓은 화면에서는 원래대로 한 줄에 이어 붙인다.
const POLICY_LINKS = [
  { href: '/terms', label: '이용약관' },
  { href: '/privacy', label: '개인정보처리방침' },
  { href: '/refund', label: '취소·환불 정책' },
  { href: '/support', label: '고객센터' },
]

const STUDY_LINKS = [
  { href: '/guides', label: '학습 자료 모음' },
  { href: '/exam-info', label: '한국실용글쓰기 시험정보' },
  { href: '/kbs-korean', label: 'KBS한국어능력시험 정보' },
  { href: '/exam-compare', label: '실용글쓰기·KBS 비교' },
  { href: '/essay-guide', label: '서술형 공략' },
  { href: '/manuscript-guide', label: '원고지 작성법' },
  { href: '/spelling', label: '자주 틀리는 맞춤법' },
  { href: '/idioms', label: '사자성어 모음' },
  { href: '/proverbs', label: '속담 모음' },
  { href: '/expressions', label: '관용구 모음' },
  { href: '/refined-words', label: '순화어 모음' },
  { href: '/honorifics', label: '높임법' },
  { href: '/standard-words', label: '표준어' },
  { href: '/loanword-spelling', label: '외래어 표기법' },
  { href: '/business-writing', label: '공문서·이메일 예시' },
  { href: '/word-counter', label: '글자수 세기' },
  { href: '/blog', label: '독학 블로그' },
  { href: '/cbt', label: '무료 CBT 모의고사' },
]
export default function SiteFooter() {
  return (
    <footer className="bg-[#080f1e] text-white/40 text-xs">
      <div className="max-w-6xl mx-auto px-4 pt-7 pb-24 sm:pb-7">
        <ul className="grid grid-cols-2 sm:flex sm:flex-wrap sm:gap-x-4 gap-y-0.5 sm:gap-y-2 mb-3 font-semibold text-white/70">
          {STUDY_LINKS.map((l, i) => (
            <li key={l.href} className="contents sm:inline">
              <Link href={l.href} className="block py-3.5 sm:py-1.5 pr-3 hover:text-white transition-colors">
                {l.label}
              </Link>
              {i < STUDY_LINKS.length - 1 && <span className="hidden sm:inline py-1.5 text-white/20">·</span>}
            </li>
          ))}
        </ul>
        {/* 약관·정책도 학습자료와 같은 규칙으로 — 휴대폰에서는 격자, 넓은 화면에서는 한 줄 */}
        <ul className="grid grid-cols-2 sm:flex sm:flex-wrap sm:gap-x-4 gap-y-0.5 sm:gap-y-2 mb-4 font-semibold text-white/70">
          {POLICY_LINKS.map((l, i) => (
            <li key={l.href} className="contents sm:inline">
              <Link href={l.href} className="block py-3.5 sm:py-1.5 pr-3 hover:text-white transition-colors">
                {l.label}
              </Link>
              {i < POLICY_LINKS.length - 1 && <span className="hidden sm:inline py-1.5 text-white/20">·</span>}
            </li>
          ))}
        </ul>

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
