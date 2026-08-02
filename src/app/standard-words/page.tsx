import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'
import TopicQuiz from '@/components/study/TopicQuiz'

export const metadata: Metadata = {
  title: "표준어 바로 알기 — 헷갈리는 비표준어·웃/윗 구분 정리",
  description:
    "표준어 규정 기준으로 자주 헷갈리는 비표준어를 표준어로 바로잡고, ‘웃-/윗-/위-’ 구분까지 한눈에 정리했어요. KBS한국어능력시험·한국실용글쓰기 어법 대비에 바로 쓰는 표준어 총정리.",
  keywords: [
    "표준어", "비표준어", "표준어 규정", "표준어 모음", "웃 윗 구분",
    "표준어 시험", "KBS한국어 표준어", "표준어 예시", "표준어 바로 알기",
  ],
  alternates: { canonical: "/standard-words" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "표준어 바로 알기 — 비표준어·웃/윗 구분",
    description: "헷갈리는 비표준어를 표준어로, ‘웃-/윗-/위-’ 구분까지 정리.",
    url: "/standard-words",
    type: "website",
  },
};

type Pair = { wrong: string; right: string };
const PAIRS: Pair[] = [
  { wrong: "아지랭이", right: "아지랑이" },
  { wrong: "강남콩", right: "강낭콩" },
  { wrong: "삭월세", right: "사글세" },
  { wrong: "미싯가루", right: "미숫가루" },
  { wrong: "상치", right: "상추" },
  { wrong: "무우", right: "무" },
  { wrong: "깡총깡총", right: "깡충깡충" },
  { wrong: "서울나기", right: "서울내기" },
  { wrong: "나뭇군", right: "나무꾼" },
  { wrong: "아뭏든", right: "아무튼" },
  { wrong: "으례", right: "으레" },
  { wrong: "켸켸묵다", right: "케케묵다" },
  { wrong: "허구헌 날", right: "허구한 날" },
  { wrong: "네째", right: "넷째" },
  { wrong: "숫돼지", right: "수퇘지" },
  { wrong: "삵괭이", right: "살쾡이" },
  { wrong: "애닯다", right: "애달프다" },
  { wrong: "사둔", right: "사돈" },
  { wrong: "삼춘", right: "삼촌" },
  { wrong: "부주(돈)", right: "부조" },
  { wrong: "끄나불", right: "끄나풀" },
  { wrong: "으시대다", right: "으스대다" },
  { wrong: "사그러들다", right: "사그라들다" },
  { wrong: "시라소니", right: "스라소니" },
  { wrong: "웃도리", right: "윗도리" },
  { wrong: "짜집기", right: "짜깁기" },
  { wrong: "남비", right: "냄비" },
  { wrong: "봉숭화", right: "봉숭아" },
  { wrong: "애기", right: "아기" },
  { wrong: "후텁지근하다", right: "후덥지근하다" },
  { wrong: "뒷꿈치", right: "뒤꿈치" },
  { wrong: "헹가레", right: "헹가래" },
  { wrong: "개거품", right: "게거품" },
  { wrong: "넓다랗다", right: "널따랗다" },
  { wrong: "얇다랗다", right: "얄따랗다" },
  { wrong: "넙적하다", right: "넓적하다" },
  { wrong: "짖궂다", right: "짓궂다" },
  { wrong: "으시시하다", right: "으스스하다" },
  { wrong: "안성마춤", right: "안성맞춤" },
  { wrong: "우유곽", right: "우유갑" },
  { wrong: "아구찜", right: "아귀찜" },
  { wrong: "애시당초", right: "애당초" },
  { wrong: "널부러지다", right: "널브러지다" },
  { wrong: "구렛나루", right: "구레나룻" },
  { wrong: "눈꼽", right: "눈곱" },
  { wrong: "설겆이", right: "설거지" },
  { wrong: "늘상", right: "늘, 노상" },
  { wrong: "어물쩡", right: "어물쩍" },
  { wrong: "널판지", right: "널빤지" },
  { wrong: "자그만치", right: "자그마치" },
];

// 웃-/윗-/위- 구분
const UP = [
  { form: "윗-", rule: "위아래 대립이 있고 뒤에 예사소리가 올 때", ex: "윗니·윗도리·윗마을·윗사람" },
  { form: "위-", rule: "위아래 대립이 있고 뒤에 거센소리·된소리가 올 때", ex: "위쪽·위층·위칸" },
  { form: "웃-", rule: "위아래 대립이 없을 때", ex: "웃어른·웃옷(겉옷)·웃돈" },
];

const FAQ = [
  {
    q: "‘웃어른’과 ‘윗사람’은 왜 다르게 쓰나요?",
    a: "‘어른’은 위아래의 대립이 없어서 ‘웃-’을 쓰고(웃어른), ‘사람’은 아랫사람과 대립하므로 ‘윗-’을 씁니다(윗사람). 위아래가 맞서는 말이면 ‘윗-/위-’, 아니면 ‘웃-’이라고 기억하면 쉬워요.",
  },
  {
    q: "표준어가 시험에 자주 나오나요?",
    a: "네. KBS한국어능력시험 어법과 한국실용글쓰기 객관식에 표준어·비표준어를 가려내는 문제가 출제됩니다. 실글패스 CBT의 ‘표준어 바로 알기’ 유형별 연습으로 익힐 수 있어요.",
  },
];

export default function StandardWordsPage() {
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
            표준어 바로 알기
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            자주 헷갈리는 <strong className="text-[#334155]">비표준어를 표준어</strong>로 바로잡고, ‘웃-/윗-/위-’ 구분까지 정리했어요.
            KBS한국어·한국실용글쓰기 어법 문제에 자주 나오는 표준어를 익혀두세요.
          </p>

          {/* 비표준 → 표준 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">비표준어 → 표준어</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2 text-left font-bold">비표준어</th>
                    <th className="px-3 py-2 text-left font-bold">표준어</th>
                  </tr>
                </thead>
                <tbody>
                  {PAIRS.map((p) => (
                    <tr key={p.wrong} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2 text-[#94a3b8] line-through">{p.wrong}</td>
                      <td className="px-3 py-2 font-bold text-[#1e3a5f]">{p.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 읽고 끝나지 않게 — 읽은 자리에서 바로 풀어보고 실전으로 잇는다 */}
          <TopicQuiz topic="standard-words" />

          {/* 웃/윗/위 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">‘웃-/윗-/위-’ 구분</h2>
            <div className="space-y-2.5">
              {UP.map((u) => (
                <div key={u.form} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-black text-[#1e3a5f]">{u.form}</span>
                    <span className="text-sm font-semibold text-[#334155]">{u.rule}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#64748b] leading-relaxed">{u.ex}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mb-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">표준어, 문제로 풀어야 굳는다</p>
              <p className="text-white/70 text-sm mb-5">실글패스 CBT의 ‘표준어 바로 알기’ 유형별 연습으로 헷갈리는 표준어를 잡아보세요. 모의고사는 무료로 시작할 수 있어요.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/cbt" className="btn-gold inline-flex items-center justify-center gap-1.5 text-white font-bold py-3 px-6 rounded-xl text-sm">
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
            <Link href="/spelling" className="underline hover:text-[#1e3a5f]">자주 틀리는 맞춤법</Link>
            {" · "}
            <Link href="/honorifics" className="underline hover:text-[#1e3a5f]">높임법</Link>
            {" · "}
            <Link href="/refined-words" className="underline hover:text-[#1e3a5f]">순화어 모음</Link>
            {" · "}
            <Link href="/kbs-korean" className="underline hover:text-[#1e3a5f]">KBS한국어 시험정보</Link>
          </section>
          <RelatedBlogPosts category="grammar" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="표준어 바로 알기" path="/standard-words" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
