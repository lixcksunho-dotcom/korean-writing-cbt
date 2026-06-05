import type { Metadata } from 'next'
import { BUSINESS, biz } from '@/lib/businessInfo'

export const metadata: Metadata = {
  title: '취소·환불 정책 · 한국실용글쓰기 CBT',
  description: '한국실용글쓰기 CBT 취소 및 환불 정책',
}

export default function RefundPage() {
  return (
    <div className="text-[#334155] text-[15px] leading-7">
      <h1 className="text-2xl font-black text-[#0f172a] mb-1">취소·환불 정책</h1>
      <p className="text-sm text-[#94a3b8] mb-8">시행일: 2026년 6월 5일</p>

      <Section title="1. 판매 상품">
        AI 채점·분석 30일 이용권(디지털 콘텐츠) — 5,500원(부가세 포함). 결제 완료 즉시 이용권이
        활성화됩니다.
      </Section>

      <Section title="2. 청약철회 및 환불 기준">
        본 상품은 「전자상거래 등에서의 소비자보호에 관한 법률」에 따른 디지털 콘텐츠로서, 환불 기준은
        다음과 같습니다.
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <span className="font-semibold text-[#0f172a]">미사용 시:</span> 결제 후 7일 이내이고 AI
            채점·분석 기능을 1회도 사용하지 않은 경우, 전액 환불해 드립니다.
          </li>
          <li>
            <span className="font-semibold text-[#0f172a]">사용 시작 후:</span> AI 채점·분석을 1회
            이상 사용한 경우, 디지털 콘텐츠의 특성상(즉시 제공·소비) 「전자상거래법」 제17조 제2항 및
            동법 시행령에 따라 청약철회가 제한될 수 있습니다.
          </li>
          <li>
            회사의 귀책(서비스 장애 등)으로 이용권을 정상적으로 사용하지 못한 경우에는 사용 여부와
            관계없이 전액 환불 또는 이용기간 연장 처리합니다.
          </li>
        </ul>
      </Section>

      <Section title="3. 환불 신청 방법">
        고객센터 이메일({biz(BUSINESS.email)})로 결제하신 계정 정보(가입 이메일)와 함께 환불을
        요청해 주세요. 접수 후 환불 가능 여부를 확인하여 안내드립니다.
      </Section>

      <Section title="4. 환불 처리 기간 및 방법">
        환불은 원결제수단으로 처리되며, 환불 승인일로부터 결제대행사(포트원 및 제휴 PG사)·카드사의
        영업일 기준 약 3~7일 이내에 완료됩니다. 카드 결제 취소의 경우 카드사 사정에 따라 반영 시점이
        달라질 수 있습니다.
      </Section>

      <Section title="5. 문의처">
        <ul className="list-disc pl-5 space-y-1">
          <li>상호: {biz(BUSINESS.companyName)}</li>
          <li>이메일: {biz(BUSINESS.email)}</li>
          {BUSINESS.phone ? <li>전화: {BUSINESS.phone}</li> : null}
        </ul>
      </Section>

      <div className="mt-10 pt-6 border-t border-[#e2e8f0] text-sm text-[#64748b]">
        <p>본 취소·환불 정책은 2026년 6월 5일부터 시행합니다.</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-base font-bold text-[#0f172a] mb-2">{title}</h2>
      <div>{children}</div>
    </section>
  )
}
