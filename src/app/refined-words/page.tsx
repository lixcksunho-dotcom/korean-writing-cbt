import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import refineWords from "@/data/refine-words.json";
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'

export const metadata: Metadata = {
  title: "순화어(다듬은 말) 모음 — 외래어·일본어 투·어려운 한자어 쉬운 말로",
  description:
    "국립국어원 다듬은 말 기준으로 외래어·일본어 투 용어·어려운 한자어를 쉬운 우리말로 바꾼 순화어를 주제별로 정리했어요. 공문서·보고서·한국실용글쓰기 서술형에 바로 쓰는 순화어 총정리.",
  keywords: [
    "순화어", "순화어 모음", "다듬은 말", "우리말 순화어", "외래어 순화",
    "일본어 투 용어", "행정용어 순화", "쉬운 우리말", "공공언어",
  ],
  alternates: { canonical: "/refined-words" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "순화어(다듬은 말) 모음 — 쉬운 우리말로",
    description: "외래어·일본어 투·어려운 한자어를 쉬운 우리말로 바꾼 순화어를 주제별로 정리.",
    url: "/refined-words",
    type: "website",
  },
};

type Item = { category: string; wrong: string; correct: string };
const ALL = refineWords as Item[];
// 카테고리 노출 순서
const ORDER = ["순화어/우리말", "외래어", "최신 순화어", "일본어 투 용어", "한자어", "외래어 표기"];
const GROUPS = ORDER
  .map((cat) => ({ cat, items: ALL.filter((x) => x.category === cat) }))
  .filter((g) => g.items.length > 0);
// ORDER에 없는 카테고리도 뒤에 붙여 누락 방지
const known = new Set(ORDER);
for (const x of ALL) {
  if (!known.has(x.category)) {
    known.add(x.category);
    GROUPS.push({ cat: x.category, items: ALL.filter((i) => i.category === x.category) });
  }
}

const FAQ = [
  {
    q: "순화어(다듬은 말)가 뭔가요?",
    a: "어려운 외래어·일본어 투 용어·한자어를 누구나 쉽게 알아들을 수 있는 우리말로 바꾼 말이에요. 국립국어원이 ‘다듬은 말’로 제안하며, 공공기관 문서와 공문서 작성에서 권장됩니다.",
  },
  {
    q: "순화어가 시험에도 나오나요?",
    a: "네. 한국실용글쓰기의 어휘·어법과 KBS한국어능력시험에 순화어·바른 표현 문제가 출제됩니다. 특히 공문서·안내문 작성 문항에서 어려운 말을 쉬운 말로 고치는 능력이 필요해요. 실글패스 CBT의 ‘순화어 O/X’ 유형별 연습으로 익힐 수 있습니다.",
  },
];

export default function RefinedWordsPage() {
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
          <Link href="/cbt" className="text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f] transition-colors py-1.5">
            무료 CBT 모의고사 →
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
          <h1 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight mb-2">
            순화어(다듬은 말) 모음
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            외래어·일본어 투 용어·어려운 한자어를 <strong className="text-[#334155]">쉬운 우리말</strong>로 바꾼 순화어를 주제별로 정리했어요.
            공문서·보고서·한국실용글쓰기 서술형에서 어려운 말을 다듬을 때 참고하세요.
          </p>

          {GROUPS.map((g) => (
            <section key={g.cat} className="mb-8">
              <h2 className="text-2xl font-black text-[#0f172a] mb-3">{g.cat} <span className="text-sm font-semibold text-[#64748b]">{g.items.length}</span></h2>
              <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f8fafc] text-[#475569]">
                      <th className="px-3 py-2 text-left font-bold">다듬을 말</th>
                      <th className="px-3 py-2 text-left font-bold">다듬은 말</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((it) => (
                      <tr key={it.wrong} className="border-t border-[#e2e8f0]">
                        <td className="px-3 py-2 text-[#64748b] align-top whitespace-nowrap">{it.wrong}</td>
                        <td className="px-3 py-2 font-semibold text-[#1e3a5f]">{it.correct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          {/* CTA */}
          <section className="mb-10 mt-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">순화어, 눈으로 보고 문제로 굳히기</p>
              <p className="text-white/70 text-sm mb-5">실글패스 CBT의 ‘순화어 O/X’와 어휘 유형별 연습으로 실전 감각을 익히세요. 모의고사는 무료로 시작할 수 있어요.</p>
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
            <Link href="/business-writing" className="underline hover:text-[#1e3a5f]">공문서·이메일 예시</Link>
            {" · "}
            <Link href="/spelling" className="underline hover:text-[#1e3a5f]">자주 틀리는 맞춤법</Link>
            {" · "}
            <Link href="/idioms" className="underline hover:text-[#1e3a5f]">사자성어 모음</Link>
            {" · "}
            <Link href="/exam-info" className="underline hover:text-[#1e3a5f]">시험정보</Link>
          </section>
          <RelatedBlogPosts category="grammar" seed="refined-words" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="순화어 모음" path="/refined-words" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
