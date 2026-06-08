import type { Metadata } from 'next'
import { BUSINESS, biz } from '@/lib/businessInfo'

export const metadata: Metadata = {
  title: '개인정보처리방침 · 실글패스',
  description: '실글패스(한국실용글쓰기 자격 대비) 개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <div className="text-[#334155] text-[15px] leading-7">
      <h1 className="text-2xl font-black text-[#0f172a] mb-1">개인정보처리방침</h1>
      <p className="text-sm text-[#94a3b8] mb-8">시행일: 2026년 6월 5일</p>

      <p className="mb-7">
        {BUSINESS.serviceName}(이하 “회사”)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의
        개인정보를 보호하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
      </p>

      <Section title="1. 수집하는 개인정보 항목">
        <ul className="list-disc pl-5 space-y-1">
          <li>회원가입·로그인: 이메일 주소, 소셜 로그인 제공자가 전달하는 프로필 정보(이름·닉네임 등)</li>
          <li>유료서비스 결제: 결제 승인 정보(결제수단·결제금액·결제일시). 카드번호 등 민감 결제정보는
            회사가 보관하지 않으며, 결제대행사(포트원) 및 제휴 PG사가 처리합니다.</li>
          <li>서비스 이용: 이용자가 작성한 답안·원고지 글, AI 채점·분석 기록</li>
          <li>자동 수집: 접속 로그, 쿠키, 기기·브라우저 정보</li>
        </ul>
      </Section>

      <Section title="2. 개인정보의 수집·이용 목적">
        <ul className="list-disc pl-5 space-y-1">
          <li>회원 식별 및 로그인 유지</li>
          <li>AI 채점·첨삭 등 서비스 제공 및 기록 저장</li>
          <li>유료서비스 결제·구독 관리 및 환불 처리</li>
          <li>서비스 개선 및 부정이용 방지</li>
        </ul>
      </Section>

      <Section title="3. 개인정보의 보유 및 이용기간">
        회원 탈퇴 시 지체 없이 파기합니다. 다만 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안
        보관합니다.
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
          <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
          <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
        </ul>
      </Section>

      <Section title="4. 개인정보의 제3자 제공 및 처리위탁">
        회사는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁합니다.
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>(주)코리아포트원 및 제휴 PG사 — 결제 처리 및 결제 도용 방지</li>
          <li>Supabase — 회원 인증 및 데이터 저장(클라우드 인프라)</li>
          <li>Anthropic — AI 채점·첨삭 처리(입력된 답안 텍스트 분석)</li>
        </ul>
        <p className="mt-2">
          회사는 법령에 근거하거나 이용자의 동의가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지
          않습니다.
        </p>
      </Section>

      <Section title="5. 이용자의 권리">
        이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수 있으며, 회원
        탈퇴를 통해 개인정보 수집·이용 동의를 철회할 수 있습니다.
      </Section>

      <Section title="6. 쿠키의 사용">
        회사는 로그인 유지 및 서비스 제공을 위해 쿠키를 사용합니다. 이용자는 브라우저 설정을 통해
        쿠키 저장을 거부할 수 있으나, 이 경우 로그인 등 일부 서비스 이용이 제한될 수 있습니다.
      </Section>

      <Section title="7. 개인정보의 안전성 확보 조치">
        회사는 개인정보 보호를 위해 전송구간 암호화(SSL), 접근권한 관리, 접근통제 등의 기술적·관리적
        보호조치를 시행합니다.
      </Section>

      <Section title="8. 개인정보 보호책임자">
        <ul className="list-disc pl-5 space-y-1">
          <li>개인정보 보호책임자: {biz(BUSINESS.privacyOfficer || BUSINESS.ceoName)}</li>
          <li>문의: {biz(BUSINESS.email)}</li>
        </ul>
        <p className="mt-2">
          개인정보 침해에 대한 신고·상담은 개인정보침해신고센터(privacy.kisa.or.kr, 국번없이 118)
          등으로 문의하실 수 있습니다.
        </p>
      </Section>

      <div className="mt-10 pt-6 border-t border-[#e2e8f0] text-sm text-[#64748b]">
        <p>본 개인정보처리방침은 2026년 6월 5일부터 시행합니다.</p>
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
