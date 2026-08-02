import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'
import TopicQuiz from '@/components/study/TopicQuiz'

export const metadata: Metadata = {
  title: "공문서·비즈니스 이메일 쓰는 법과 예시 (기안문·안내문 양식)",
  description:
    "공문서 기본 구조, 사내 안내문·기안문 예시, 비즈니스 이메일(요청·안내·사과) 예시와 정중한 표현까지. 한국실용글쓰기 서술형과 실무 문서 작성에 바로 쓰는 예시 모음.",
  keywords: [
    "공문서 작성", "공문서 예시", "기안문 양식", "사내 공지 예시", "안내문 예시",
    "비즈니스 이메일 예시", "업무 이메일", "정중한 표현", "한국실용글쓰기 공문서", "실용글쓰기 서술형",
  ],
  alternates: { canonical: "/business-writing" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "공문서·비즈니스 이메일 쓰는 법과 예시",
    description: "공문서 구조, 안내문·기안문·이메일 예시와 정중한 표현 모음.",
    url: "/business-writing",
    type: "website",
  },
};

const STRUCTURE = [
  { part: "제목", desc: "문서 내용을 한 줄로. 예: 「연차 사용 안내」" },
  { part: "수신·참조", desc: "받는 사람/부서. 예: 전 직원" },
  { part: "본문", desc: "목적 → 세부 내용(일시·대상·방법) → 협조 요청 순" },
  { part: "붙임(첨부)", desc: "관련 서식·자료가 있으면 표시. 예: 붙임 신청서 1부." },
  { part: "발신 명의·날짜", desc: "작성 부서/직위, 작성일" },
];

const POLITE = [
  { plain: "확인해 주세요", polite: "확인해 주시기 바랍니다" },
  { plain: "해 주세요", polite: "협조해 주시면 감사하겠습니다" },
  { plain: "안 됩니다", polite: "어려운 점 양해 부탁드립니다" },
  { plain: "알려 드립니다", polite: "아래와 같이 안내드립니다" },
  { plain: "물어보고 싶습니다", polite: "문의드립니다" },
  { plain: "빨리 답장 주세요", polite: "회신 부탁드립니다" },
  { plain: "파일 첨부했어요", polite: "붙임과 같이 송부드립니다" },
  { plain: "참석 못 해요", polite: "부득이한 사정으로 참석이 어렵습니다" },
  { plain: "검토해 주세요", polite: "검토 후 회신하여 주시기 바랍니다" },
  { plain: "급하게 처리해 주세요", polite: "조속히 처리해 주시면 감사하겠습니다" },
  { plain: "잘 받았어요", polite: "보내 주신 자료 잘 수령하였습니다" },
  { plain: "알겠습니다", polite: "말씀하신 내용 확인하였습니다" },
  { plain: "답장 기다릴게요", polite: "회신을 기다리겠습니다" },
  { plain: "미리 고마워요", polite: "협조에 미리 감사드립니다" },
  { plain: "만나서 얘기해요", polite: "자리를 마련하여 논의드리고자 합니다" },
  { plain: "다시 보내 주세요", polite: "재송부하여 주시기 바랍니다" },
  { plain: "늦어서 죄송해요", polite: "회신이 늦어져 죄송합니다" },
  { plain: "수정해 주세요", polite: "수정하여 주시면 감사하겠습니다" },
  { plain: "그렇게 할게요", polite: "말씀하신 대로 진행하겠습니다" },
  { plain: "문제 있으면 연락 주세요", polite: "문의 사항이 있으시면 연락 주시기 바랍니다" },
  { plain: "회의 잡을게요", polite: "회의 일정을 잡아 공유드리겠습니다" },
  { plain: "확인 후 연락드릴게요", polite: "확인 후 회신드리겠습니다" },
  { plain: "도와주셔서 고마워요", polite: "협조해 주셔서 감사합니다" },
  { plain: "참고해 주세요", polite: "참고하여 주시기 바랍니다" },
  { plain: "마감 지켜 주세요", polite: "기한 내 제출하여 주시기 바랍니다" },
  { plain: "결정되면 알려 주세요", polite: "결정되는 대로 회신하여 주시기 바랍니다" },
  { plain: "시간 괜찮으세요?", polite: "시간이 괜찮으신지 여쭙습니다" },
  { plain: "부탁이 있어요", polite: "한 가지 부탁 말씀 드립니다" },
  { plain: "첨부 확인해 주세요", polite: "붙임 자료를 확인하여 주시기 바랍니다" },
  { plain: "죄송하지만 부탁해요", polite: "번거로우시겠지만 부탁드립니다" },
  { plain: "답변 주셔서 고마워요", polite: "답변해 주셔서 감사합니다" },
  { plain: "잘 부탁드립니다", polite: "아무쪼록 잘 부탁드립니다" },
  { plain: "빨리 회신 주세요", polite: "바쁘시겠지만 회신해 주시면 감사하겠습니다" },
  { plain: "참고하세요", polite: "업무에 참고하시기 바랍니다" },
  { plain: "첨부합니다", polite: "관련 자료를 첨부하오니 확인 부탁드립니다" },
];

const FAQ = [
  {
    q: "공문서 본문은 어떤 순서로 쓰나요?",
    a: "① 목적(왜 쓰는지)을 한 문장으로 밝히고 ② 세부 내용을 일시·대상·방법으로 나눠 구체적으로 적은 뒤 ③ 협조·당부로 마무리합니다. 문장은 짧고 명확하게, 높임 표현은 일관되게 쓰세요.",
  },
  {
    q: "비즈니스 이메일에서 꼭 지킬 것은?",
    a: "제목에 용건을 드러내고(예: [요청] 3분기 보고서 검토), 첫 문장에 소속·이름을 밝힌 뒤 본론을 두괄식으로 씁니다. 요청은 기한과 함께 구체적으로, 마무리는 정중한 인사로 닫으세요.",
  },
  {
    q: "이런 문서 작성이 시험에도 나오나요?",
    a: "네. 한국실용글쓰기 서술형에는 안내문·이메일·공문서 고쳐쓰기 같은 실무형 작문이 자주 나와요. 조건(대상 명시·형식·높임)을 지키는 게 채점 핵심입니다. 실글패스에서 실제 유형으로 연습하고 서술형은 AI 첨삭까지 받을 수 있어요.",
  },
];

export default function BusinessWritingPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-[#e2e8f0] bg-white">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoGlyph className="h-7 w-7" />
            <span className="font-black text-[#1e3a5f]">실글패스</span>
          </Link>
          <Link href="/cbt" className="text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f] transition-colors">
            무료 CBT 모의고사 →
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
          <h1 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight mb-2">
            공문서·비즈니스 이메일 쓰는 법
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            <strong className="text-[#334155]">공문서 구조, 안내문·기안문·이메일 예시</strong>와 정중한 표현까지 한 번에.
            실무 문서는 물론 한국실용글쓰기 서술형(안내문·이메일·공문서 작성)에도 그대로 쓰는 틀이에요.
          </p>

          {/* 공문서 구조 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">공문서 기본 구조</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <tbody>
                  {STRUCTURE.map((s) => (
                    <tr key={s.part} className="border-t border-[#e2e8f0] first:border-t-0">
                      <td className="px-3 py-2.5 font-bold text-[#0f172a] whitespace-nowrap align-top w-28">{s.part}</td>
                      <td className="px-3 py-2.5 text-[#64748b] leading-relaxed">{s.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 읽고 끝나지 않게 — 읽은 자리에서 바로 풀어보고 실전으로 잇는다 */}
          <TopicQuiz topic="business-writing" />

          {/* 안내문 예시 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">사내 안내문 예시</h2>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-sm text-[#334155] leading-relaxed whitespace-pre-line">
{`제목: 연차 사용 촉진 안내

전 직원 여러분께 안내드립니다.

원활한 연차 사용을 위해 아래와 같이 안내드리니 기한 내 신청해 주시기 바랍니다.

  1. 대상: 2026년 미사용 연차가 남은 전 직원
  2. 신청 방법: 그룹웨어 '연차 신청' 메뉴에서 등록
  3. 신청 기한: 2026. 7. 31.(금)까지

업무에 지장이 없도록 부서별로 일정을 조율해 주시면 감사하겠습니다.

2026. 7. 3.
인사팀`}
            </div>
          </section>

          {/* 이메일 예시 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">비즈니스 이메일 예시</h2>

            <p className="text-sm font-bold text-[#475569] mb-2">① 요청 메일</p>
            <div className="mb-5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-sm text-[#334155] leading-relaxed whitespace-pre-line">
{`제목: [요청] 3분기 실적 보고서 검토 부탁드립니다

안녕하세요, 영업기획팀 김민수입니다.

3분기 실적 보고서 초안을 첨부드립니다. 아래 두 가지만 검토해 주시면 감사하겠습니다.
  - 매출 수치 정합성
  - 4분기 전망 문구

7월 8일(수) 오전까지 회신 주시면 반영하겠습니다. 감사합니다.

김민수 드림`}
            </div>

            <p className="text-sm font-bold text-[#475569] mb-2">② 사과·양해 메일</p>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-sm text-[#334155] leading-relaxed whitespace-pre-line">
{`제목: 납기 지연 안내 및 양해 요청

안녕하세요, ○○상사 이서연입니다.

먼저 예정된 납기를 맞추지 못하게 되어 진심으로 사과드립니다.
자재 수급 지연으로 납품이 3일가량 늦어질 예정이며, 7월 12일까지 완료하겠습니다.

불편을 끼쳐 드린 점 양해 부탁드리며, 재발 방지에 최선을 다하겠습니다.

이서연 드림`}
            </div>
          </section>

          {/* 정중한 표현 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">정중하게 바꾸는 표현</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2.5 text-left font-bold">평범한 표현</th>
                    <th className="px-3 py-2.5 text-left font-bold">정중한 표현</th>
                  </tr>
                </thead>
                <tbody>
                  {POLITE.map((p) => (
                    <tr key={p.plain} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2.5 text-[#94a3b8]">{p.plain}</td>
                      <td className="px-3 py-2.5 font-semibold text-[#1e3a5f]">{p.polite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* CTA */}
          <section className="mb-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">서술형은 ‘조건 지키기’가 점수예요</p>
              <p className="text-white/70 text-sm mb-5">한국실용글쓰기 서술형은 안내문·이메일·공문서 작성이 자주 나와요. 실전처럼 풀고 AI 첨삭으로 조건 충족·높임 표현까지 점검하세요. 무료로 시작할 수 있어요.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/cbt" className="btn-gold inline-flex items-center justify-center gap-1.5 text-white font-bold py-3 px-6 rounded-xl text-sm">
                  무료 CBT 모의고사 풀어보기
                </Link>
                <Link href="/signup" className="inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm bg-white/10 text-white border border-white/20 hover:bg-white/15 transition-colors">
                  무료로 시작하기
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-12">
            <h2 className="text-2xl font-black text-[#0f172a] mb-4">자주 묻는 질문</h2>
            <div className="space-y-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group bg-[#f8fafc] rounded-xl border border-[#e2e8f0] px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-[#0f172a] text-base">
                    <span>{f.q}</span>
                    <span className="ml-3 text-[#94a3b8] text-2xl leading-none transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[#475569] text-sm leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* 관련 */}
          <section className="mt-10 text-sm text-[#64748b]">
            관련:{" "}
            <Link href="/exam-info" className="underline hover:text-[#1e3a5f]">한국실용글쓰기 시험정보</Link>
            {" · "}
            <Link href="/spelling" className="underline hover:text-[#1e3a5f]">자주 틀리는 맞춤법</Link>
            {" · "}
            <Link href="/word-counter" className="underline hover:text-[#1e3a5f]">글자수 세기</Link>
          </section>
          <RelatedBlogPosts category="writing" seed="business-writing" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="공문서·비즈니스 이메일" path="/business-writing" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}

