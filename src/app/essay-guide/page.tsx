import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "한국실용글쓰기 서술형 유형별 공략 (배점 700점 완벽 정리)",
  description:
    "한국실용글쓰기 서술형(작문) 700점 유형별 공략 — 요약·고쳐쓰기·안내문/이메일·원고지 보고서 쓰는 법과 채점 포인트(조건 충족·내용·표현). 독학으로 서술형 점수 올리는 실전 가이드.",
  keywords: [
    "한국실용글쓰기 서술형", "실용글쓰기 서술형 공략", "한국실용글쓰기 작문",
    "한국실용글쓰기 원고지", "서술형 채점 기준", "한국실용글쓰기 공부법",
    "실용글쓰기 서술형 예시", "한국실용글쓰기 독학", "안내문 작성", "고쳐쓰기",
  ],
  alternates: { canonical: "/essay-guide" },
  openGraph: {
    title: "한국실용글쓰기 서술형 유형별 공략 (700점)",
    description: "요약·고쳐쓰기·안내문/이메일·원고지 보고서 쓰는 법과 채점 포인트 정리.",
    url: "/essay-guide",
    type: "website",
  },
};

const TYPES = [
  { name: "요약하기", how: "핵심 문장을 추려 조건(글자 수) 안에서 압축. 군더더기·중복을 빼는 게 점수 포인트.", tip: "지문에서 중심 문장부터 표시하고, 부연·예시는 과감히 생략." },
  { name: "고쳐쓰기", how: "맞춤법·문장 호응·중복·비문을 바르게 수정. 어문 규정을 정확히 알아야 함.", tip: "‘되/돼, 안/않, 로서/로써’ 같은 자주 틀리는 규정부터 확실히." },
  { name: "자료 활용 (안내문·이메일)", how: "표·그래프 등 자료를 읽고 목적·대상·방법을 갖춰 실무 문서로 작성.", tip: "‘대상 명시 → 세부(일시·방법) → 협조 요청’ 순서 + 높임 표현 일관성." },
  { name: "원고지 보고서 (9번·300점)", how: "주어진 자료를 근거로 주장·방향을 제시하는 장문. 배점이 커서 시간 배분 필수.", tip: "서론(목적)–본론(근거 2가지)–결론(제언) 뼈대를 먼저 잡고 칸을 채우기." },
];

const FAQ = [
  {
    q: "서술형은 모범답안과 똑같이 써야 정답인가요?",
    a: "아니요. 표현이 달라도 문제의 조건(시작 어구·문장 수·어절 수·형식 등)을 지키고 내용이 타당하면 정답으로 인정됩니다. 그래서 ‘조건 체크리스트’를 먼저 만들고 다 넣었는지 확인하는 습관이 중요해요.",
  },
  {
    q: "서술형 배점이 어떻게 되나요?",
    a: "한국실용글쓰기는 1000점 만점에 객관식(선택형) 300점 + 서술형(작문) 700점입니다. 서술형 비중이 커서 등급은 사실상 서술형에서 갈립니다.",
  },
  {
    q: "서술형을 혼자 채점하기 어려운데 어떻게 하나요?",
    a: "독학의 가장 큰 벽이 바로 서술형 자가 채점이에요. 실글패스(kptest.cloud) 같은 실전 CBT에서 서술형 답안을 AI로 채점·첨삭받으면 ‘어디서 감점되는지’를 문장 단위로 확인할 수 있어요. 모의고사 2회분은 무료라 수준 점검용으로 먼저 써봐도 됩니다.",
  },
];

export default function EssayGuidePage() {
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
            한국실용글쓰기 서술형 유형별 공략
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            서술형(작문)은 <strong className="text-[#334155]">700점(총 1000점 만점)</strong> — 등급이 사실상 여기서 갈립니다.
            유형별 쓰는 법과 채점 포인트를 정리했어요. 핵심은 <strong className="text-[#334155]">‘문제 조건 지키기’</strong>예요.
          </p>

          <div className="mb-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-[#fffbeb] to-[#fff7ed] p-5 text-sm text-[#475569] leading-relaxed">
            채점은 <b className="text-[#1e3a5f]">① 조건 충족</b>(시작 어구·문장 수·어절 수·형식) · <b className="text-[#1e3a5f]">② 내용 타당성</b> · <b className="text-[#1e3a5f]">③ 표현 정확성</b>(맞춤법·어법·문어체)으로 이뤄집니다. 모범답안과 표현이 달라도 <b className="text-[#1e3a5f]">조건을 지키고 내용이 맞으면 정답</b>이에요.
          </div>

          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-4">유형별 공략</h2>
            <div className="space-y-3">
              {TYPES.map((t, i) => (
                <div key={t.name} className="rounded-xl border border-[#e2e8f0] bg-white p-5">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
                    <h3 className="font-black text-[#0f172a]">{t.name}</h3>
                  </div>
                  <p className="text-sm text-[#475569] leading-relaxed">{t.how}</p>
                  <p className="mt-1.5 text-sm text-[#1e3a5f]"><b>팁</b> · {t.tip}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">서술형은 ‘써보고 채점받아야’ 늘어요</p>
              <p className="text-white/70 text-sm mb-5">실전 CBT로 유형별 서술형을 풀고, AI 채점·첨삭으로 감점 포인트를 문장 단위로 확인하세요. 모의고사 2회분은 무료예요.</p>
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

          <section className="mt-10 text-sm text-[#64748b]">
            관련:{" "}
            <Link href="/exam-info" className="underline hover:text-[#1e3a5f]">시험정보</Link>
            {" · "}
            <Link href="/business-writing" className="underline hover:text-[#1e3a5f]">공문서·이메일 예시</Link>
            {" · "}
            <Link href="/spelling" className="underline hover:text-[#1e3a5f]">자주 틀리는 맞춤법</Link>
            {" · "}
            <Link href="/word-counter" className="underline hover:text-[#1e3a5f]">글자수 세기</Link>
          </section>
        </div>
      </main>

      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
