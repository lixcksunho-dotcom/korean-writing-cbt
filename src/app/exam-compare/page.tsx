import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'
import TopicQuiz from '@/components/study/TopicQuiz'

export const metadata: Metadata = {
  title: "한국실용글쓰기 vs KBS한국어능력시험 — 차이·비교와 선택 가이드",
  description:
    "한국실용글쓰기와 KBS한국어능력시험, 뭐가 다를까요? 시험 형식(서술형 중심 vs 객관식 중심), 배점, 평가 영역, 활용처를 한눈에 비교하고 나에게 맞는 시험을 고르세요. 두 시험 모두 실글패스 CBT로 대비할 수 있어요.",
  keywords: [
    "실용글쓰기 KBS 차이", "한국실용글쓰기 KBS한국어 비교", "국어 자격증 비교",
    "KBS한국어능력시험 실용글쓰기", "국어 능력 시험 종류", "국어 자격증 추천",
    "실용글쓰기 vs KBS", "국어능력인증시험 비교",
  ],
  alternates: { canonical: "/exam-compare" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "한국실용글쓰기 vs KBS한국어능력시험 — 차이·비교",
    description: "형식·배점·영역·활용을 비교하고 나에게 맞는 국어 자격시험을 고르세요.",
    url: "/exam-compare",
    type: "website",
  },
};

// 값은 실글패스 프로그램 설정(공개 시험 구조 기반)과 일반적으로 알려진 사실만 사용.
type Row = { label: string; sil: string; kbs: string };
const TABLE: Row[] = [
  { label: "만점", sil: "1,000점", kbs: "990점" },
  { label: "시험 시간", sil: "120분", kbs: "120분(듣기 포함)" },
  { label: "출제 형식", sil: "객관식 + 서술형(작문)", kbs: "객관식 100문항 중심" },
  { label: "배점 비중", sil: "서술형 700 · 객관식 300", kbs: "객관식 900 · 쓰기 90" },
  { label: "핵심 평가", sil: "실무 글쓰기·원고지 작문·고쳐쓰기", kbs: "듣기·읽기·어휘·어법·창안 등 종합 국어 능력" },
  { label: "등급", sil: "1급·2급·준2급·3급·준3급", kbs: "8단계(1급~4⁻급)" },
];

const SIL_AREAS = ["어휘·어법·어문 규정", "글쓰기 계획·조직·고쳐쓰기", "독해·자료 해석", "서술형(원고지 작문)"];
const KBS_AREAS = ["듣기·말하기", "어휘", "어법", "쓰기", "창안", "읽기", "국어문화"];

const CHOOSE = [
  {
    pick: "한국실용글쓰기가 맞아요",
    who: "실무 문서(공문서·이메일·보고서) 작성 능력을 증명하고 싶거나, 서술형·원고지 작문에 강점을 만들고 싶은 분. 직접 ‘써서’ 평가받는 비중이 커요.",
    href: "/exam-info",
    cta: "실용글쓰기 시험정보",
  },
  {
    pick: "KBS한국어능력시험이 맞아요",
    who: "듣기·읽기·어휘·어법까지 폭넓은 국어 능력을 객관식으로 종합 평가받고 싶은 분. 문항 수가 많고 영역이 넓어요.",
    href: "/kbs-korean",
    cta: "KBS한국어 시험정보",
  },
];

const FAQ = [
  {
    q: "한국실용글쓰기와 KBS한국어능력시험, 뭐가 더 어렵나요?",
    a: "난이도는 사람마다 달라요. 글쓰기(작문)에 자신 있으면 서술형 비중이 큰 실용글쓰기가 유리하고, 폭넓은 국어 지식과 독해·듣기에 강하면 객관식 중심의 KBS한국어가 유리합니다. 목표(취업·자기계발)와 강점에 맞춰 고르세요.",
  },
  {
    q: "둘 다 준비해도 되나요?",
    a: "네. 어휘·어법·맞춤법 같은 기초는 두 시험이 공유하기 때문에, 한쪽을 공부하면 다른 쪽에도 도움이 됩니다. 실글패스에서는 상단에서 시험을 전환해 두 시험을 같은 방식으로 연습할 수 있어요.",
  },
  {
    q: "실글패스로 두 시험을 모두 대비할 수 있나요?",
    a: "네. 실용글쓰기·KBS한국어 모두 실전 CBT 모의고사, 유형별 연습, 오답 관리를 제공하고, 실용글쓰기는 서술형·원고지 AI 첨삭까지 지원합니다. 모의고사는 무료로 먼저 풀어볼 수 있어요.",
  },
];

export default function ExamComparePage() {
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
            한국실용글쓰기 vs KBS한국어능력시험
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            둘 다 국어 능력을 평가하는 자격시험이지만 <strong className="text-[#334155]">형식과 초점이 달라요</strong>.
            실용글쓰기는 <strong className="text-[#334155]">서술형(작문) 중심</strong>, KBS한국어는{" "}
            <strong className="text-[#334155]">객관식 종합 평가</strong>입니다. 아래 비교로 나에게 맞는 시험을 골라보세요.
          </p>

          {/* 비교표 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">한눈에 비교</h2>
            <div className="overflow-x-auto rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm min-w-[32rem]">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2.5 text-left font-bold"> </th>
                    <th className="px-3 py-2.5 text-left font-bold text-[#1e3a5f]">한국실용글쓰기</th>
                    <th className="px-3 py-2.5 text-left font-bold text-emerald-700">KBS한국어능력시험</th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE.map((r) => (
                    <tr key={r.label} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2.5 font-bold text-[#64748b] whitespace-nowrap align-top">{r.label}</td>
                      <td className="px-3 py-2.5 text-[#334155] align-top">{r.sil}</td>
                      <td className="px-3 py-2.5 text-[#334155] align-top">{r.kbs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-[#94a3b8]">※ 등급 기준·배점은 주관처 사정으로 달라질 수 있어요. 접수 전 각 공식 홈페이지에서 확인하세요.</p>
          </section>

          {/* 읽고 끝나지 않게 — 읽은 자리에서 바로 풀어보고 실전으로 잇는다 */}
          <TopicQuiz topic="exam-compare" />

          {/* 평가 영역 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">평가 영역</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
                <p className="font-black text-[#1e3a5f] mb-2">한국실용글쓰기</p>
                <ul className="space-y-1.5 text-sm text-[#475569]">
                  {SIL_AREAS.map((a) => <li key={a}>· {a}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
                <p className="font-black text-emerald-700 mb-2">KBS한국어능력시험</p>
                <ul className="space-y-1.5 text-sm text-[#475569]">
                  {KBS_AREAS.map((a) => <li key={a}>· {a}</li>)}
                </ul>
              </div>
            </div>
          </section>

          {/* 선택 가이드 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">나에게 맞는 시험은?</h2>
            <div className="space-y-3">
              {CHOOSE.map((c) => (
                <div key={c.pick} className="rounded-xl border border-[#e2e8f0] bg-white p-5">
                  <p className="font-black text-[#0f172a] mb-1">{c.pick}</p>
                  <p className="text-sm text-[#475569] leading-relaxed mb-3">{c.who}</p>
                  <Link href={c.href} className="text-sm font-bold text-[#1e3a5f] hover:underline">{c.cta} →</Link>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mb-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">두 시험 모두, 실글패스에서 대비하세요</p>
              <p className="text-white/70 text-sm mb-5">실용글쓰기·KBS한국어 모두 실전 CBT 모의고사와 유형별 연습을 제공해요. 상단에서 시험을 전환해 원하는 쪽을 무료로 먼저 풀어보세요.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/cbt" className="btn-gold inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm">
                  무료 CBT 모의고사
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
                    <span className="ml-3 text-[#64748b] text-2xl leading-none transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[#475569] text-sm leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* 관련 */}
          <section className="mt-10 text-sm text-[#64748b]">
            관련:{" "}
            <Link href="/exam-info" className="underline hover:text-[#1e3a5f]">실용글쓰기 시험정보</Link>
            {" · "}
            <Link href="/kbs-korean" className="underline hover:text-[#1e3a5f]">KBS한국어 시험정보</Link>
            {" · "}
            <Link href="/essay-guide" className="underline hover:text-[#1e3a5f]">서술형 공략</Link>
            {" · "}
            <Link href="/manuscript-guide" className="underline hover:text-[#1e3a5f]">원고지 작성법</Link>
          </section>
          <RelatedBlogPosts category="exam-info" seed="exam-compare" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="시험 비교" path="/exam-compare" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
