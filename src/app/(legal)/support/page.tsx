import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Phone, Clock } from 'lucide-react'
import { BUSINESS, biz } from '@/lib/businessInfo'
import FeedbackForm from '@/components/support/FeedbackForm'

export const metadata: Metadata = {
  title: '고객센터',
  description:
    '실글패스 문의 안내 — 이메일·전화와 운영 시간, 결제와 이용권, 모의고사 응시와 AI 첨삭에 대해 자주 묻는 질문을 모았습니다. 답을 못 찾으면 직접 문의해 주세요.',
}

const FAQS = [
  {
    q: '구독은 어떻게 하나요?',
    a: '로그인 후 [구독] 페이지에서 결제하시면, 결제 완료 즉시 30일 이용권이 활성화됩니다.',
  },
  {
    q: '이용요금과 결제 수단은 어떻게 되나요?',
    a: 'AI 채점·분석 구독은 30일권 5,500원(부가세 포함)입니다. 신용카드와 간편결제로 결제할 수 있으며, 카카오페이 전용 결제는 준비 중입니다.',
  },
  {
    q: '구독은 자동으로 갱신되나요?',
    a: '아니요. 자동 갱신되지 않으며, 이용권 만료 후 재결제로 연장하실 수 있습니다.',
  },
  {
    q: '환불이 가능한가요?',
    a: '결제 후 7일 이내이고 AI 채점·분석을 1회도 사용하지 않은 경우 전액 환불해 드립니다. 자세한 기준은 취소·환불 정책을 확인해 주세요.',
  },
  {
    q: 'AI 채점 결과가 실제 시험 점수와 같나요?',
    a: 'AI 채점·첨삭은 학습 보조를 위한 참고 정보이며, 실제 시험의 채점 결과와는 다를 수 있습니다.',
  },
  {
    q: '무료로 이용할 수 있는 기능이 있나요?',
    a: 'CBT 문제풀이는 회원이라면 무료로 이용하실 수 있습니다. AI 원고지·서술형 채점·첨삭은 구독 기능입니다.',
  },
  {
    q: '계정을 여러 명이 같이 써도 되나요?',
    a: '아니요. 이용권은 결제한 본인 1인만 사용할 수 있고, 한 계정은 최대 3대 기기까지만 이용 가능합니다. 계정 공유나 기기 수 초과 등 부정 이용이 확인되면 사전 통지 없이 이용이 제한될 수 있으며, 이 경우 잔여 기간은 환불되지 않습니다.',
  },
]

export default function SupportPage() {
  return (
    <div className="text-[#334155] text-[15px] leading-7">
      <h1 className="text-2xl font-black text-[#0f172a] mb-1">고객센터</h1>
      <p className="text-sm text-[#64748b] mb-6">불편한 점은 아래에서 바로 알려주실 수 있어요. 답변이 필요하시면 연락처를 남겨 주세요.</p>

      {/* 메일 앱을 여는 사람만 말할 수 있으면, 대부분은 조용히 떠난다 — 그 자리에서 바로 쓰게 한다. */}
      <div className="mb-10">
        <FeedbackForm email={BUSINESS.email} />
      </div>

      {/* 연락처 카드 */}
      <div className="grid sm:grid-cols-3 gap-3 mb-10">
        <ContactCard icon={<Mail className="h-5 w-5" />} label="이메일">
          <a href={`mailto:${BUSINESS.email}`} className="inline-flex items-center min-h-11 text-[#1e3a5f] font-semibold break-all hover:underline">
            {BUSINESS.email}
          </a>
        </ContactCard>
        <ContactCard icon={<Phone className="h-5 w-5" />} label="전화">
          <a href={`tel:${BUSINESS.phone.replace(/-/g, '')}`} className="inline-flex items-center min-h-11 text-[#1e3a5f] font-semibold hover:underline">
            {biz(BUSINESS.phone)}
          </a>
        </ContactCard>
        <ContactCard icon={<Clock className="h-5 w-5" />} label="운영시간">
          <span className="text-[#334155] text-sm">평일 10:00–18:00<br />(점심 12:00–13:00 제외)<br />주말·공휴일 휴무</span>
        </ContactCard>
      </div>

      <p className="text-sm text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 mb-10">
        이메일 문의는 24시간 접수되며, 운영시간 내 순차적으로 답변드립니다. 결제·환불 문의 시 가입하신
        이메일 주소와 <b className="text-[#334155]">주문번호</b>를 함께 보내주시면 빠르게 확인할 수 있습니다.
        주문번호는 결제 안내 화면에 표시되며, 없으시면 결제하신 시각만 알려 주셔도 됩니다.
      </p>

      {/* 자주 묻는 질문 */}
      <h2 className="text-lg font-black text-[#0f172a] mb-4">자주 묻는 질문</h2>
      <div className="space-y-2.5">
        {FAQS.map(({ q, a }) => (
          <details key={q} className="group bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
            <summary className="cursor-pointer list-none px-5 py-3.5 font-semibold text-[#0f172a] text-sm flex items-center justify-between hover:bg-[#f8fafc] transition-colors">
              {q}
              <span className="text-[#64748b] group-open:rotate-180 transition-transform">⌄</span>
            </summary>
            <div className="px-5 pb-4 text-sm text-[#475569] leading-relaxed">{a}</div>
          </details>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-[#e2e8f0] text-sm text-[#64748b]">
        관련 정책:{' '}
        <Link href="/terms" className="inline-flex items-center min-h-11 text-[#1e3a5f] font-semibold hover:underline">이용약관</Link> ·{' '}
        <Link href="/privacy" className="inline-flex items-center min-h-11 text-[#1e3a5f] font-semibold hover:underline">개인정보처리방침</Link> ·{' '}
        <Link href="/refund" className="inline-flex items-center min-h-11 text-[#1e3a5f] font-semibold hover:underline">취소·환불 정책</Link>
      </div>
    </div>
  )
}

function ContactCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
      <div className="flex items-center gap-2 text-[#64748b] mb-2">
        <span className="text-[#1e3a5f]">{icon}</span>
        <span className="text-xs font-bold">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}
