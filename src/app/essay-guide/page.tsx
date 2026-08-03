import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'
import TopicQuiz from '@/components/study/TopicQuiz'

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
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
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

// 내용이 좋아도 놓치기 쉬운 감점 요인 — 유형과 무관하게 공통으로 적용된다.
const MISTAKES = [
  { bad: "조건 누락", fix: "시작 어구·문장 수·어절 수·형식 조건을 하나라도 빠뜨리면 내용이 좋아도 감점. 답안 쓰기 전 조건을 번호로 적어두고 하나씩 지워가며 확인한다." },
  { bad: "글자 수 초과·미달", fix: "제한 글자 수를 크게 벗어나면 감점. 원고지 칸을 미리 세어 목표 분량을 표시하고, 마지막에 한 번 더 센다." },
  { bad: "구어체·반말 섞임", fix: "‘~같아요, ~거든요, ~죠’ 같은 구어체나 반말은 감점. ‘~이다/~한다’ 문어체로 처음부터 끝까지 일관되게 쓴다." },
  { bad: "개조식 남발", fix: "‘-함, -임, -할 것’ 식 개조식은 완결된 문장으로 풀어 쓴다. 개조식이 요구되는 형식(일부 안내문 등)일 때만 예외." },
  { bad: "논제 이탈·서론 장황", fix: "배경 설명이 길어 정작 묻는 것에 답하지 못하면 감점. 첫 문장부터 논제에 답하고, 근거로 뒷받침한다." },
  { bad: "문체 혼용", fix: "‘~다’체와 ‘~습니다’체를 한 답안에서 섞어 쓰면 감점. 종결 어미를 하나로 통일한다." },
  { bad: "주술 호응 불일치", fix: "주어와 서술어가 맞지 않는 비문은 감점. ‘내가 강조하고 싶은 것은 ~해야 한다(X)→~라는 점이다(O)’처럼 성분을 맞춘다." },
  { bad: "겹말·중복 표현", fix: "‘역전 앞·미리 예약·처갓집’처럼 같은 뜻을 겹쳐 쓰면 감점. 한쪽을 덜어 낸다." },
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
  {
    q: "서술형 시간이 늘 부족한데 어떻게 배분하나요?",
    a: "배점이 큰 원고지 장문(9번)에 시간을 넉넉히 확보하는 게 핵심이에요. 객관식·단답형을 먼저 빠르게 끝내 서술형 시간을 벌고, 원고지 답안은 ‘뼈대(서론·근거·결론)를 먼저 잡고 칸을 채우는’ 순서로 쓰면 중간에 막히지 않아요. 실글패스 CBT는 실제 제한 시간이 있어 시간 감각을 기르기 좋습니다.",
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
          <Link href="/" className="flex items-center gap-2 py-2">
            <LogoGlyph className="h-7 w-7" />
            <span className="font-black text-[#1e3a5f]">실글패스</span>
          </Link>
          <Link href="/cbt" className="text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f] transition-colors py-3">
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

          {/* 읽고 끝나지 않게 — 읽은 자리에서 바로 풀어보고 실전으로 잇는다 */}
          <TopicQuiz topic="essay-guide" />

          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-4">감점을 부르는 흔한 실수</h2>
            <div className="space-y-2.5">
              {MISTAKES.map((m) => (
                <div key={m.bad} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <p className="font-black text-red-500 text-sm">✕ {m.bad}</p>
                  <p className="mt-1 text-sm text-[#475569] leading-relaxed">{m.fix}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">서술형은 ‘써보고 채점받아야’ 늘어요</p>
              <p className="text-white/70 text-sm mb-5">실전 CBT로 유형별 서술형을 풀고, AI 채점·첨삭으로 감점 포인트를 문장 단위로 확인하세요. 모의고사 2회분은 무료예요.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/cbt" className="btn-gold inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm">
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
                    <span className="ml-3 text-[#64748b] text-2xl leading-none transition-transform group-open:rotate-45">+</span>
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
            <Link href="/manuscript-guide" className="underline hover:text-[#1e3a5f]">원고지 작성법</Link>
            {" · "}
            <Link href="/business-writing" className="underline hover:text-[#1e3a5f]">공문서·이메일 예시</Link>
            {" · "}
            <Link href="/spelling" className="underline hover:text-[#1e3a5f]">자주 틀리는 맞춤법</Link>
            {" · "}
            <Link href="/word-counter" className="underline hover:text-[#1e3a5f]">글자수 세기</Link>
          </section>
          <RelatedBlogPosts category="writing" seed="essay-guide" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="서술형 작성법" path="/essay-guide" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
