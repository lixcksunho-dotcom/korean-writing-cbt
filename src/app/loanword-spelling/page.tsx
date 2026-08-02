import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'
import TopicQuiz from '@/components/study/TopicQuiz'

export const metadata: Metadata = {
  title: "외래어 표기법 — 자주 틀리는 외래어 표기 총정리 (초콜릿·리모컨)",
  description:
    "외래어 표기법 기준으로 자주 틀리는 외래어 표기를 틀림→바름으로 정리했어요. 된소리를 쓰지 않고 받침은 7개만 쓰는 원칙까지. KBS한국어능력시험·한국실용글쓰기 어법 대비용 외래어 표기 총정리.",
  keywords: [
    "외래어 표기법", "외래어 표기", "외래어 맞춤법", "자주 틀리는 외래어",
    "초콜릿 초콜렛", "리모컨 리모콘", "외래어 표기 규칙", "KBS한국어 외래어",
  ],
  alternates: { canonical: "/loanword-spelling" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "외래어 표기법 — 자주 틀리는 외래어 표기 총정리",
    description: "된소리 없이, 받침은 7개만. 초콜릿·리모컨 등 헷갈리는 외래어 표기를 틀림→바름으로.",
    url: "/loanword-spelling",
    type: "website",
  },
};

const RULES = [
  { name: "된소리를 쓰지 않는다", desc: "파열음 표기에는 된소리(ㄲㄸㅃㅆㅉ)를 쓰지 않는다.", ex: "버스(O)/뻐스(X), 카페(O)/까페(X), 파리(O)/빠리(X)" },
  { name: "받침은 7개만", desc: "받침에는 ‘ㄱ, ㄴ, ㄹ, ㅁ, ㅂ, ㅇ, ㅅ’만 쓴다.", ex: "커피숍(O)/커피숖(X), 로봇(O)/로보트(X)" },
  { name: "굳어진 말은 관용 존중", desc: "이미 널리 굳어진 외래어는 관용에 따라 적는다.", ex: "라디오·카메라·바나나(원칙보다 관용 우선)" },
];

type Fix = { wrong: string; right: string };
const FIXES: Fix[] = [
  { wrong: "초콜렛", right: "초콜릿" },
  { wrong: "케잌", right: "케이크" },
  { wrong: "쥬스", right: "주스" },
  { wrong: "소세지", right: "소시지" },
  { wrong: "도너츠", right: "도넛" },
  { wrong: "카톨릭", right: "가톨릭" },
  { wrong: "바베큐", right: "바비큐" },
  { wrong: "로보트", right: "로봇" },
  { wrong: "리모콘", right: "리모컨" },
  { wrong: "앙케이트", right: "앙케트" },
  { wrong: "컨셉", right: "콘셉트" },
  { wrong: "악세사리", right: "액세서리" },
  { wrong: "플랭카드", right: "플래카드" },
  { wrong: "렌트카", right: "렌터카" },
  { wrong: "화이팅", right: "파이팅" },
  { wrong: "밧데리", right: "배터리" },
  { wrong: "메세지", right: "메시지" },
  { wrong: "컨텐츠", right: "콘텐츠" },
  { wrong: "심포지움", right: "심포지엄" },
  { wrong: "앰블런스", right: "앰뷸런스" },
  { wrong: "쏘스", right: "소스" },
  { wrong: "화일", right: "파일" },
  { wrong: "넌센스", right: "난센스" },
  { wrong: "팜플렛", right: "팸플릿" },
  { wrong: "앙콜", right: "앙코르" },
  { wrong: "데뷰", right: "데뷔" },
  { wrong: "카페트", right: "카펫" },
  { wrong: "스카웃", right: "스카우트" },
  { wrong: "알콜", right: "알코올" },
  { wrong: "타겟", right: "타깃" },
  { wrong: "멤버쉽", right: "멤버십" },
  { wrong: "스폰지", right: "스펀지" },
  { wrong: "비스켓", right: "비스킷" },
  { wrong: "로숀", right: "로션" },
  { wrong: "스티로폴", right: "스티로폼" },
  { wrong: "나레이션", right: "내레이션" },
  { wrong: "카달로그", right: "카탈로그" },
  { wrong: "데이타", right: "데이터" },
  { wrong: "매니아", right: "마니아" },
  { wrong: "컴플렉스", right: "콤플렉스" },
  { wrong: "스넥", right: "스낵" },
  { wrong: "째즈", right: "재즈" },
  { wrong: "비젼", right: "비전" },
  { wrong: "랑데뷰", right: "랑데부" },
  { wrong: "헬로윈", right: "핼러윈" },
  { wrong: "프로포즈", right: "프러포즈" },
  { wrong: "쇼파", right: "소파" },
  { wrong: "텔레비젼", right: "텔레비전" },
  { wrong: "라이센스", right: "라이선스" },
  { wrong: "넌픽션", right: "논픽션" },
  { wrong: "로타리", right: "로터리" },
  { wrong: "레크레이션", right: "레크리에이션" },
];

const FAQ = [
  {
    q: "‘까페’와 ‘카페’ 중 뭐가 맞나요?",
    a: "‘카페’가 맞습니다. 외래어 표기법은 파열음에 된소리(ㄲㄸㅃㅆㅉ)를 쓰지 않아요. 그래서 ‘빠리’가 아니라 ‘파리’, ‘뻐스’가 아니라 ‘버스’로 적습니다.",
  },
  {
    q: "외래어 표기가 시험에 나오나요?",
    a: "네. KBS한국어능력시험 어법과 한국실용글쓰기 객관식에 외래어 표기를 바르게 적었는지 묻는 문제가 출제됩니다. 순화어(다듬은 말)와는 별개로, 표기 규칙 자체를 익혀 두어야 해요.",
  },
];

export default function LoanwordSpellingPage() {
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
            외래어 표기법
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            자주 틀리는 <strong className="text-[#334155]">외래어 표기를 틀림→바름</strong>으로 정리했어요.
            된소리를 쓰지 않고 받침은 7개만 쓰는 원칙을 알면 헷갈림이 크게 줄어요.
          </p>

          {/* 원칙 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">표기 원칙</h2>
            <div className="space-y-2.5">
              {RULES.map((r) => (
                <div key={r.name} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <p className="font-black text-[#1e3a5f]">{r.name}</p>
                  <p className="mt-1 text-sm text-[#475569] leading-relaxed">{r.desc}</p>
                  <p className="mt-1 text-sm text-[#64748b]">{r.ex}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 읽고 끝나지 않게 — 읽은 자리에서 바로 풀어보고 실전으로 잇는다 */}
          <TopicQuiz topic="loanword-spelling" />

          {/* 틀림 → 바름 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">자주 틀리는 외래어 표기</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2 text-left font-bold">틀린 표기</th>
                    <th className="px-3 py-2 text-left font-bold">바른 표기</th>
                  </tr>
                </thead>
                <tbody>
                  {FIXES.map((f) => (
                    <tr key={f.wrong} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2 text-[#94a3b8] line-through">{f.wrong}</td>
                      <td className="px-3 py-2 font-bold text-[#1e3a5f]">{f.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* CTA */}
          <section className="mb-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">외래어 표기, 문제로 굳히기</p>
              <p className="text-white/70 text-sm mb-5">실글패스 CBT의 어휘·어법 유형별 연습으로 헷갈리는 외래어 표기를 잡아보세요. 모의고사는 무료로 시작할 수 있어요.</p>
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
            <Link href="/refined-words" className="underline hover:text-[#1e3a5f]">순화어 모음</Link>
            {" · "}
            <Link href="/spelling" className="underline hover:text-[#1e3a5f]">자주 틀리는 맞춤법</Link>
            {" · "}
            <Link href="/standard-words" className="underline hover:text-[#1e3a5f]">표준어 바로 알기</Link>
            {" · "}
            <Link href="/kbs-korean" className="underline hover:text-[#1e3a5f]">KBS한국어 시험정보</Link>
          </section>
          <RelatedBlogPosts category="grammar" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="외래어 표기법" path="/loanword-spelling" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
