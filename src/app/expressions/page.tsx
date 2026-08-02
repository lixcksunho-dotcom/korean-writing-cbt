import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'
import TopicQuiz from '@/components/study/TopicQuiz'

export const metadata: Metadata = {
  title: "시험에 자주 나오는 관용구 모음 (뜻·풀이 정리)",
  description:
    "한국실용글쓰기·KBS한국어능력시험에 자주 나오는 관용구를 주제별로 뜻과 함께 정리했어요. 발이 넓다·귀가 얇다·손을 떼다 등 핵심 관용 표현을 한눈에 익히고 실전 CBT로 어휘 문제를 연습하세요.",
  keywords: [
    "관용구", "관용구 모음", "관용어", "관용 표현", "관용구 뜻",
    "시험 관용구", "KBS한국어 관용구", "실용글쓰기 어휘", "자주 나오는 관용구",
  ],
  alternates: { canonical: "/expressions" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "시험에 자주 나오는 관용구 모음 (뜻·풀이)",
    description: "발이 넓다·귀가 얇다·손을 떼다 등 핵심 관용구를 주제별로 뜻과 함께 정리.",
    url: "/expressions",
    type: "website",
  },
};

// 뜻이 명확하고 널리 통용되는 관용구만 엄선.
type Expr = { phrase: string; meaning: string };
type Group = { theme: string; items: Expr[] };
const GROUPS: Group[] = [
  {
    theme: "성격·태도",
    items: [
      { phrase: "귀가 얇다", meaning: "남의 말을 쉽게 받아들이고 잘 믿는다." },
      { phrase: "입이 무겁다", meaning: "말이 적고 비밀을 잘 지킨다." },
      { phrase: "낯이 두껍다", meaning: "부끄러움을 모르고 뻔뻔하다." },
      { phrase: "오지랖이 넓다", meaning: "쓸데없이 남의 일에 참견을 잘한다." },
      { phrase: "입이 짧다", meaning: "음식을 가려 먹거나 적게 먹는다." },
      { phrase: "간이 크다", meaning: "겁이 없고 매우 대담하다." },
      { phrase: "코가 높다", meaning: "잘난 체하며 뽐내는 기세가 있다." },
    ],
  },
  {
    theme: "능력·처지",
    items: [
      { phrase: "발이 넓다", meaning: "아는 사람이 많아 활동 범위가 넓다." },
      { phrase: "손이 크다", meaning: "씀씀이가 크고 후하다." },
      { phrase: "눈이 높다", meaning: "안목이 높거나 기대하는 수준이 높다." },
      { phrase: "물 만난 고기", meaning: "제 능력을 펼칠 좋은 기회를 만나다." },
      { phrase: "어깨를 나란히 하다", meaning: "서로 비슷한 지위나 힘을 가지다." },
      { phrase: "손이 모자라다", meaning: "일할 사람이 부족하다." },
    ],
  },
  {
    theme: "행동",
    items: [
      { phrase: "발 벗고 나서다", meaning: "적극적으로 나서서 일을 돕는다." },
      { phrase: "손을 떼다", meaning: "하던 일이나 관계를 그만두다." },
      { phrase: "머리를 맞대다", meaning: "여럿이 모여 함께 의논하다." },
      { phrase: "시치미를 떼다", meaning: "알고도 모르는 척한다." },
      { phrase: "손사래를 치다", meaning: "거절하거나 부인하며 손을 내젓다." },
      { phrase: "진땀을 빼다", meaning: "어려운 일로 몹시 애를 쓰다." },
    ],
  },
  {
    theme: "상황·감정",
    items: [
      { phrase: "미역국을 먹다", meaning: "시험에서 떨어지다." },
      { phrase: "바가지를 쓰다", meaning: "실제보다 비싸게 값을 치러 손해를 보다." },
      { phrase: "하늘이 노랗다", meaning: "절망적이거나 기력이 다해 정신이 아득하다." },
      { phrase: "코가 납작해지다", meaning: "기가 꺾이고 창피를 당하다." },
      { phrase: "손에 땀을 쥐다", meaning: "아슬아슬하여 몹시 긴장하다." },
      { phrase: "찬물을 끼얹다", meaning: "잘되어 가는 일에 뛰어들어 분위기를 망치다." },
      { phrase: "눈이 뒤집히다", meaning: "충격이나 흥분으로 이성을 잃다." },
    ],
  },
  {
    theme: "일·상황",
    items: [
      { phrase: "발등에 불이 떨어지다", meaning: "일이 몹시 급하게 닥치다." },
      { phrase: "손발이 맞다", meaning: "함께 일할 때 마음과 행동이 잘 어울리다." },
      { phrase: "귀에 못이 박히다", meaning: "같은 말을 여러 번 되풀이해 듣다." },
      { phrase: "입에 침이 마르다", meaning: "다른 사람이나 물건을 몹시 칭찬하다." },
      { phrase: "배가 아프다", meaning: "남이 잘되는 것을 시기하고 못마땅해하다." },
      { phrase: "발이 묶이다", meaning: "매여서 움직이거나 활동할 수 없게 되다." },
    ],
  },
  {
    theme: "말·관계",
    items: [
      { phrase: "말꼬리를 잡다", meaning: "남이 한 말의 일부를 트집 잡다." },
      { phrase: "담을 쌓다", meaning: "관계를 끊거나 어떤 일에 관심을 두지 않다." },
      { phrase: "김이 새다", meaning: "재미나 의욕이 없어지다." },
      { phrase: "물꼬를 트다", meaning: "어떤 일의 실마리나 시작을 열다." },
      { phrase: "발목을 잡다", meaning: "어떤 일에 꼼짝 못 하게 하거나 앞길을 방해하다." },
    ],
  },
  {
    theme: "감정·태도",
    items: [
      { phrase: "혀를 내두르다", meaning: "몹시 놀라거나 어이없어하다." },
      { phrase: "가슴을 쓸어내리다", meaning: "걱정하던 일이 풀려 마음을 놓다." },
      { phrase: "뒷짐을 지다", meaning: "직접 나서지 않고 방관하다." },
      { phrase: "어깨가 무겁다", meaning: "맡은 책임이 크고 부담스럽다." },
      { phrase: "목이 빠지게 기다리다", meaning: "몹시 애타게 오래 기다리다." },
      { phrase: "속이 타다", meaning: "몹시 걱정되어 마음이 조마조마하다." },
      { phrase: "진이 빠지다", meaning: "기운이 다 소모되어 몹시 지치다." },
    ],
  },
  {
    theme: "생활·태도",
    items: [
      { phrase: "눈감아 주다", meaning: "잘못을 알고도 못 본 척 넘어가 주다." },
      { phrase: "발 디딜 틈이 없다", meaning: "사람이 많아 몹시 붐비다." },
      { phrase: "손꼽아 기다리다", meaning: "날짜를 세며 몹시 기대하고 기다리다." },
      { phrase: "가슴에 새기다", meaning: "잊지 않도록 마음에 깊이 새겨 두다." },
      { phrase: "등을 돌리다", meaning: "관계를 끊거나 외면하다." },
    ],
  },
  {
    theme: "행동·관계",
    items: [
      { phrase: "손을 씻다", meaning: "나쁜 일이나 관계에서 완전히 손을 떼다." },
      { phrase: "발을 끊다", meaning: "오가거나 관계하던 것을 끊다." },
      { phrase: "눈에 밟히다", meaning: "잊히지 않고 자꾸 떠오르다." },
      { phrase: "귀가 솔깃하다", meaning: "그럴듯하여 마음이 쏠리다." },
      { phrase: "콧대를 꺾다", meaning: "상대의 자만심이나 기를 꺾다." },
      { phrase: "코웃음을 치다", meaning: "대수롭지 않게 여겨 비웃다." },
    ],
  },
  {
    theme: "심리·판단",
    items: [
      { phrase: "눈에 차다", meaning: "흡족하게 마음에 들다." },
      { phrase: "눈에 불을 켜다", meaning: "몹시 관심을 기울이거나 화를 내다." },
      { phrase: "입을 모으다", meaning: "여러 사람이 한목소리로 같은 의견을 말하다." },
      { phrase: "발을 뻗다", meaning: "걱정을 덜고 마음을 놓다." },
      { phrase: "가슴을 치다", meaning: "몹시 분해하거나 후회하다." },
    ],
  },
];

const FAQ = [
  {
    q: "관용구는 속담·사자성어와 어떻게 다른가요?",
    a: "관용구는 둘 이상의 단어가 굳어져 원래 뜻과 다른 특별한 의미를 나타내는 표현이에요(예: ‘발이 넓다’=아는 사람이 많다). 속담은 교훈을 담은 짧은 말, 사자성어는 네 글자 한자 표현입니다. 시험에서는 세 가지가 모두 어휘 영역으로 출제돼요.",
  },
  {
    q: "관용구가 시험에 어떻게 나오나요?",
    a: "뜻을 묻거나, 문맥에 알맞은 관용구를 고르거나, 잘못 쓰인 것을 찾는 형태로 나옵니다. 뜻과 함께 예문 속 쓰임을 익히면 실전에 강해져요. 실글패스 CBT에서 유형별로 어휘 문제를 골라 연습할 수 있어요.",
  },
];

export default function ExpressionsPage() {
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
            시험에 자주 나오는 관용구
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            한국실용글쓰기·KBS한국어능력시험 어휘 영역에 자주 나오는 <strong className="text-[#334155]">관용구를 주제별로</strong> 뜻과 함께 정리했어요.
            글자 그대로의 뜻이 아니라 <strong className="text-[#334155]">굳어진 특별한 의미</strong>를 익히는 것이 핵심입니다.
          </p>

          {GROUPS.map((g, gi) => (
            <Fragment key={g.theme}>
            <section className="mb-8">
              <h2 className="text-2xl font-black text-[#0f172a] mb-3">{g.theme}</h2>
              <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
                <table className="w-full text-sm">
                  <tbody>
                    {g.items.map((it) => (
                      <tr key={it.phrase} className="border-t border-[#e2e8f0] first:border-t-0">
                        <td className="px-3 py-2.5 align-top font-bold text-[#1e3a5f] whitespace-nowrap">{it.phrase}</td>
                        <td className="px-3 py-2.5 text-[#475569] leading-relaxed">{it.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {/* 읽고 끝나지 않게 — 첫 묶음을 본 직후, 아직 페이지를 떠나기 전에 */}
            {gi === 0 && <TopicQuiz topic="expressions" />}
            </Fragment>
          ))}

          {/* CTA */}
          <section className="mb-10 mt-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">어휘는 ‘문제로 풀어야’ 는다</p>
              <p className="text-white/70 text-sm mb-5">관용구·속담·사자성어·어휘 문제를 실전 CBT로 유형별로 연습하세요. 실용글쓰기·KBS한국어 모두 모의고사는 무료로 시작할 수 있어요.</p>
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
            <Link href="/idioms" className="underline hover:text-[#1e3a5f]">사자성어 모음</Link>
            {" · "}
            <Link href="/proverbs" className="underline hover:text-[#1e3a5f]">속담 모음</Link>
            {" · "}
            <Link href="/spelling" className="underline hover:text-[#1e3a5f]">자주 틀리는 맞춤법</Link>
            {" · "}
            <Link href="/kbs-korean" className="underline hover:text-[#1e3a5f]">KBS한국어 시험정보</Link>
          </section>
          <RelatedBlogPosts category="grammar" seed="expressions" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="관용구 모음" path="/expressions" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
