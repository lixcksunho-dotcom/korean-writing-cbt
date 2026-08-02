import type { Metadata } from 'next'
import { BUSINESS, biz } from '@/lib/businessInfo'

export const metadata: Metadata = {
  // 제목에 '실글패스'를 또 넣으면 루트 template(%s | 실글패스)과 겹쳐 두 번 붙는다.
  title: '이용약관',
  description:
    '실글패스 서비스 이용약관 — 회원가입과 계정, 서비스 제공 범위, 유료서비스 결제와 청약철회·환불, 이용자의 의무, 저작권과 면책, 분쟁해결까지 12개 조항을 안내합니다.',
}

export default function TermsPage() {
  return (
    <div className="text-[#334155] text-[15px] leading-7">
      <h1 className="text-2xl font-black text-[#0f172a] mb-1">이용약관</h1>
      <p className="text-sm text-[#94a3b8] mb-8">시행일: 2026년 6월 5일</p>

      <Section title="제1조 (목적)">
        본 약관은 {BUSINESS.serviceName}(이하 “회사”)가 제공하는 온라인 자격증 학습·AI 채점
        서비스(이하 “서비스”)의 이용과 관련하여 회사와 이용자의 권리·의무 및 책임사항을
        규정함을 목적으로 합니다.
      </Section>

      <Section title="제2조 (정의)">
        <ul className="list-disc pl-5 space-y-1">
          <li>“서비스”란 회사가 제공하는 CBT 문제풀이, 원고지 작성, AI 채점·첨삭 기능 등을 말합니다.</li>
          <li>“이용자”란 본 약관에 따라 서비스를 이용하는 회원을 말합니다.</li>
          <li>“유료서비스”란 회사가 유료로 제공하는 AI 채점·분석 구독 등을 말합니다.</li>
        </ul>
      </Section>

      <Section title="제3조 (약관의 효력 및 변경)">
        본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다. 회사는 관련 법령을 위배하지 않는
        범위에서 약관을 변경할 수 있으며, 변경 시 적용일자 및 사유를 명시하여 사전 공지합니다.
      </Section>

      <Section title="제4조 (회원가입 및 계정)">
        이용자는 이메일 또는 소셜 로그인(구글 등)을 통해 회원가입을 할 수 있습니다. 이용자는 본인의
        계정 정보를 관리할 책임이 있으며, 계정의 부정 사용에 대한 책임은 이용자에게 있습니다.
        계정은 결제한 본인 1인만 사용할 수 있고 타인과 공유·양도할 수 없으며, 회사는 부정 이용 방지를
        위해 한 계정의 동시 이용 기기 수(최대 3대) 및 일일 이용량을 제한할 수 있습니다.
      </Section>

      <Section title="제5조 (서비스의 제공)">
        회사는 다음의 서비스를 제공합니다.
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>CBT 형식의 모의고사·연습문제 풀이</li>
          <li>원고지 서술형 작성 도구</li>
          <li>AI를 활용한 서술형·원고지 채점 및 첨삭(유료)</li>
          <li>채점·분석 기록 저장</li>
        </ul>
      </Section>

      <Section title="제6조 (유료서비스 및 결제)">
        <ul className="list-disc pl-5 space-y-1">
          <li>AI 채점·분석 구독의 이용요금은 30일권 5,500원(부가세 포함)입니다.</li>
          <li>결제는 결제대행사(포트원 및 제휴 PG사)를 통해 신용카드·간편결제 등으로 처리됩니다.</li>
          <li>결제가 정상 완료되면 즉시 30일 이용권이 활성화됩니다.</li>
          <li>이용권은 자동 갱신되지 않으며, 만료 시 재결제로 연장할 수 있습니다.</li>
        </ul>
      </Section>

      <Section title="제7조 (청약철회 및 환불)">
        유료서비스의 청약철회 및 환불은 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련
        법령과 회사의 <a href="/refund" className="text-[#1e3a5f] font-semibold underline">취소·환불 정책</a>에
        따릅니다.
      </Section>

      <Section title="제8조 (이용자의 의무 및 이용 제한)">
        이용자는 서비스를 부정한 목적으로 이용하거나, 자동화된 수단으로 서비스에 과도한 부하를
        유발하거나, 타인의 권리를 침해하는 행위를 하여서는 안 됩니다. 특히 계정(아이디·비밀번호)을
        타인과 공유하거나 다수가 돌려 쓰는 행위, 허용된 기기 수를 초과한 이용은 금지됩니다.
        이러한 부정 이용이 확인되는 경우 회사는 사전 통지 없이 서비스 이용을 제한·정지할 수 있으며,
        <span className="font-semibold text-[#0f172a]"> 이 경우 잔여 이용기간에 대한 환불은 제공되지 않습니다.</span>
      </Section>

      <Section title="제9조 (저작권 및 콘텐츠)">
        서비스가 제공하는 모든 문제·지문·자료·해설·모범답안은 시험의 출제 유형과 난이도를 참고하여 회사가
        자체 제작한 창작물로, 기출문제나 타 교재를 복제하지 않습니다.{' '}
        <span className="font-semibold text-[#0f172a]">이 콘텐츠의 저작권은 회사(운영자)에게 단독으로 귀속되며</span>,
        이용자는 회사의 사전 서면 동의 없이 이를 복제·캡처·녹화·배포·전송·게시하거나 영리 목적으로
        이용할 수 없습니다. 이를 위반하는 경우 회사는 이용 제한 및 「저작권법」 등 관련 법령에 따른
        민·형사상 책임을 물을 수 있습니다. 한편 이용자가 작성한 답안의 저작권은 이용자에게 있으며,
        회사는 서비스 제공 및 개선 목적의 범위에서만 이용자 작성물을 처리합니다.
      </Section>

      <Section title="제10조 (비공식 서비스 고지)">
        본 서비스는 한국실용글쓰기 자격시험 대비를 돕는 비공식 사설 학습 서비스로, 시험의 시행·주관
        기관과 어떠한 제휴·후원·인증 관계도 없습니다. ‘한국실용글쓰기’를 포함한 시험 명칭·표장의
        권리는 각 권리자에게 있으며, 본 서비스는 해당 시험을 지칭하기 위한 목적으로만 명칭을 사용합니다.
        실제 시험의 접수·일정·채점 기준은 반드시 공식 시행 기관을 통해 확인하시기 바랍니다.
      </Section>

      <Section title="제11조 (면책)">
        AI 채점·첨삭 결과는 학습 보조를 위한 참고 정보이며, 실제 시험의 채점 결과와 다를 수 있습니다.
        회사는 천재지변, 이용자 귀책 등 회사의 통제를 벗어난 사유로 인한 손해에 대하여 책임을 지지
        않습니다.
      </Section>

      <Section title="제12조 (분쟁해결 및 준거법)">
        본 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련하여 분쟁이 발생할 경우 회사와
        이용자는 성실히 협의하여 해결합니다. 협의가 이루어지지 않을 경우 관할 법원은 민사소송법에
        따릅니다.
      </Section>

      <div className="mt-10 pt-6 border-t border-[#e2e8f0] text-sm text-[#64748b] space-y-1">
        <p>상호: {biz(BUSINESS.companyName)} / 대표자: {biz(BUSINESS.ceoName)}</p>
        <p>사업자등록번호: {biz(BUSINESS.businessNumber)}</p>
        <p>주소: {biz(BUSINESS.address)}</p>
        <p>문의: {biz(BUSINESS.email)}</p>
        <p className="pt-2">부칙 — 본 약관은 2026년 6월 5일부터 시행합니다.</p>
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
