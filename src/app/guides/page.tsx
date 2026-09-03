import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import InlineQuiz from '@/components/try/InlineQuiz';

export const metadata: Metadata = {
  title: "학습 자료 모음 — 어휘·어법·작문 국어 자료 총정리",
  description:
    "한국실용글쓰기·KBS한국어능력시험 대비 학습 자료를 한곳에 모았어요. 사자성어·속담·관용구·순화어 어휘 자료부터 맞춤법·높임법·표준어·외래어 표기법, 원고지 작성법·서술형 공략까지 무료로 정리했습니다.",
  keywords: [
    "국어 학습 자료", "한국어 어휘 어법 정리", "실용글쓰기 자료", "KBS한국어 자료",
    "맞춤법 어휘 정리", "국어 시험 자료", "국어 능력 자료", "무료 국어 자료",
  ],
  alternates: { canonical: "/guides" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "학습 자료 모음 — 어휘·어법·작문 총정리",
    description: "사자성어·속담·순화어·맞춤법·높임법·원고지 작성법까지 무료 국어 학습 자료.",
    url: "/guides",
    type: "website",
  },
};

type Card = { href: string; title: string; desc: string };
type Section = { heading: string; cards: Card[] };
const SECTIONS: Section[] = [
  {
    heading: "어휘",
    cards: [
      { href: "/idioms", title: "사자성어 모음", desc: "시험에 자주 나오는 사자성어를 주제별로 뜻과 함께." },
      { href: "/proverbs", title: "속담 모음", desc: "핵심 속담을 뜻·풀이와 함께 주제별로." },
      { href: "/expressions", title: "관용구 모음", desc: "발이 넓다·귀가 얇다 등 관용 표현 뜻 정리." },
      { href: "/refined-words", title: "순화어 모음", desc: "외래어·일본어 투·한자어를 쉬운 우리말로." },
    ],
  },
  {
    heading: "어법",
    cards: [
      { href: "/spelling", title: "자주 틀리는 맞춤법", desc: "되/돼·띄어쓰기 등 헷갈리는 표기 총정리." },
      { href: "/honorifics", title: "높임법 바로 쓰기", desc: "사물 존대(과잉 높임) 오류와 높임 어휘." },
      { href: "/standard-words", title: "표준어 바로 알기", desc: "비표준어→표준어, ‘웃/윗/위’ 구분." },
      { href: "/loanword-spelling", title: "외래어 표기법", desc: "초콜릿·리모컨 등 자주 틀리는 외래어 표기." },
    ],
  },
  {
    heading: "작문·문서",
    cards: [
      { href: "/manuscript-guide", title: "원고지 작성법", desc: "칸·문장부호·띄어쓰기 원고지 규정." },
      { href: "/essay-guide", title: "서술형 공략", desc: "유형별 쓰는 법과 감점 포인트." },
      { href: "/business-writing", title: "공문서·이메일 예시", desc: "실무 문서 구조와 정중 표현." },
      { href: "/word-counter", title: "글자수 세기", desc: "공백 포함·제외, 원고지 칸수 계산 도구." },
    ],
  },
  {
    heading: "시험 정보",
    cards: [
      { href: "/exam-info", title: "한국실용글쓰기 시험정보", desc: "일정·등급·점수 구성 총정리." },
      { href: "/kbs-korean", title: "KBS한국어능력시험 정보", desc: "영역·등급·시험 구성." },
      { href: "/exam-compare", title: "실용글쓰기·KBS 비교", desc: "형식·배점·영역을 비교하고 선택." },
    ],
  },
];

export default function GuidesPage() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-[#e2e8f0] bg-white">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 py-2">
            <LogoGlyph className="h-7 w-7" />
            <span className="font-black text-[#1e3a5f]">실글패스</span>
          </Link>
          <Link href="/try" className="text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f] transition-colors py-3">
            가입 없이 문제 풀어보기 →
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
          <h1 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight mb-2">
            학습 자료 모음
          </h1>
          <p className="text-[#64748b] mb-8 leading-relaxed">
            한국실용글쓰기·KBS한국어능력시험 대비에 필요한 <strong className="text-[#334155]">어휘·어법·작문 자료</strong>를 한곳에 모았어요.
            무료로 보고, 실전 CBT로 문제까지 풀어보세요.
          </p>

          {SECTIONS.map((s) => (
            <section key={s.heading} className="mb-8">
              <h2 className="text-2xl font-black text-[#0f172a] mb-3">{s.heading}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {s.cards.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="card-hover group block rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_4px_16px_rgba(15,31,61,0.06)]"
                  >
                    <p className="font-black text-[#1e3a5f] group-hover:text-[#0f1f3d]">{c.title}</p>
                    <p className="mt-1 text-sm text-[#64748b] leading-relaxed">{c.desc}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          {/* 자료 목록만 보고 나가지 않게 — '문제로 굳히기'를 권하기 전에 한 문제를 풀려 본다. */}
          <InlineQuiz topic={{ keyword: "문장", label: "문장 고르기" }} />

          {/* CTA */}
          <section className="mb-10 mt-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">자료로 익히고, 문제로 굳히기</p>
              <p className="text-white/70 text-sm mb-5">실글패스 CBT로 실전 모의고사와 유형별 연습을, 서술형은 AI 첨삭까지. 모의고사는 무료로 시작할 수 있어요.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/try" className="btn-gold inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm">
                  가입 없이 문제 풀어보기
                </Link>
                <Link href="/signup" className="inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm bg-white/10 text-white border border-white/20 hover:bg-white/15 transition-colors">
                  무료로 시작하기
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <StickyMobileCTA />
      <SiteFooter />
    </div>
  );
}
