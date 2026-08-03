import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import WordCounter from "./WordCounter";
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'

export const metadata: Metadata = {
  title: "글자수 세기 — 공백 포함·제외, 원고지 칸수까지 무료 계산",
  description:
    "글자수 세기 무료 도구. 공백 포함·제외 글자수, 단어수, 줄수, 바이트, 원고지 칸수·매수를 실시간으로 계산합니다. 한국실용글쓰기 서술형, 자소서, 과제 글자수 제한 맞추기에 딱.",
  keywords: [
    "글자수 세기", "글자수 계산기", "글자수 세기 공백 포함", "글자수 세기 공백 제외",
    "원고지 칸수 계산", "원고지 매수 계산", "바이트 계산기", "자소서 글자수",
    "한국실용글쓰기 글자수", "서술형 글자수",
  ],
  alternates: { canonical: "/word-counter" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "글자수 세기 — 공백 포함·제외, 원고지 칸수까지",
    description:
      "공백 포함·제외 글자수, 단어·줄·바이트, 원고지 칸수·매수를 실시간 계산하는 무료 도구.",
    url: "/word-counter",
    type: "website",
  },
};

const FAQ = [
  {
    q: "공백 포함과 공백 제외 글자수는 무엇이 다른가요?",
    a: "공백 포함은 띄어쓰기(스페이스)까지 한 글자로 세고, 공백 제외는 띄어쓰기를 빼고 셉니다. 한국실용글쓰기 서술형처럼 '띄어쓰기 포함 N자 이내'로 제한될 때는 공백 포함 기준을 보세요.",
  },
  {
    q: "원고지 칸수와 매수는 어떻게 계산하나요?",
    a: "원고지는 한 칸에 한 글자(띄어쓰기도 한 칸)예요. 그래서 칸수는 공백 포함 글자수와 같고, 200자 원고지 기준 매수는 칸수를 200으로 나눈 값입니다.",
  },
  {
    q: "바이트는 왜 표시되나요?",
    a: "일부 입력 제한은 글자수가 아니라 바이트로 걸려요. 보통 한글은 2바이트, 영문·숫자·기호는 1바이트로 계산합니다.",
  },
  {
    q: "한국실용글쓰기 서술형 글자수 제한에 맞추려면?",
    a: "문제에 '띄어쓰기 포함 ○○자 이내'가 자주 나와요. 공백 포함 글자수를 보며 제한 안에 맞추는 연습을 하세요. 실글패스에서 실제 CBT처럼 글자수 제한이 적용된 서술형을 연습할 수 있어요.",
  },
];

export default function WordCountPage() {
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
      {/* 상단바 */}
      <header className="border-b border-[#e2e8f0] bg-white">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoGlyph className="h-7 w-7" />
            <span className="font-black text-[#1e3a5f]">실글패스</span>
          </Link>
          <Link href="/" className="py-1.5 text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f] transition-colors">
            한국실용글쓰기 CBT →
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
          <h1 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight mb-2">글자수 세기</h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            공백 포함·제외 글자수, 단어·줄·바이트, <strong className="text-[#334155]">원고지 칸수·매수</strong>까지 실시간으로 계산하는 무료 도구예요.
            자소서·과제·한국실용글쓰기 서술형의 글자수 제한을 맞출 때 사용하세요.
          </p>

          <WordCounter />

          {/* SEO 본문 */}
          <section className="mt-12 prose-sm">
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
          <RelatedBlogPosts category="writing" seed="word-counter" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="글자 수 세기" path="/word-counter" />
      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </div>
  );
}
