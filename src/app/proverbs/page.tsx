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
  title: "시험에 자주 나오는 속담 모음 (뜻·풀이 정리)",
  description:
    "한국실용글쓰기·KBS한국어능력시험에 자주 나오는 속담을 주제별로 뜻과 함께 정리했어요. 노력·말·처세·인간관계 등 핵심 속담을 한눈에 익히고 실전 CBT로 어휘 문제를 연습하세요.",
  keywords: [
    "속담", "속담 모음", "속담 뜻", "우리말 속담", "시험 속담",
    "KBS한국어 속담", "실용글쓰기 어휘", "자주 나오는 속담", "속담 풀이",
  ],
  alternates: { canonical: "/proverbs" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "시험에 자주 나오는 속담 모음 (뜻·풀이)",
    description: "노력·말·처세·인간관계 등 핵심 속담을 주제별로 뜻과 함께 정리.",
    url: "/proverbs",
    type: "website",
  },
};

// 뜻이 명확하고 널리 통용되는 속담만 엄선.
type Proverb = { saying: string; meaning: string };
type Group = { theme: string; items: Proverb[] };
const GROUPS: Group[] = [
  {
    theme: "노력·꾸준함",
    items: [
      { saying: "공든 탑이 무너지랴", meaning: "정성과 노력을 다한 일은 헛되지 않는다." },
      { saying: "티끌 모아 태산", meaning: "작은 것도 모으고 모으면 큰 것이 된다." },
      { saying: "천 리 길도 한 걸음부터", meaning: "아무리 큰일도 작은 시작에서 비롯된다." },
      { saying: "열 번 찍어 안 넘어가는 나무 없다", meaning: "꾸준히 애쓰면 뜻을 이룰 수 있다." },
      { saying: "낙숫물이 댓돌을 뚫는다", meaning: "작은 힘도 꾸준히 계속하면 큰일을 이룬다." },
      { saying: "구르는 돌에는 이끼가 안 낀다", meaning: "부지런히 애쓰는 사람은 침체하지 않고 발전한다." },
    ],
  },
  {
    theme: "말·언어",
    items: [
      { saying: "발 없는 말이 천 리 간다", meaning: "말은 삽시간에 멀리 퍼지니 조심해야 한다." },
      { saying: "낮말은 새가 듣고 밤말은 쥐가 듣는다", meaning: "아무도 없는 데서도 말은 조심해야 한다." },
      { saying: "가는 말이 고와야 오는 말이 곱다", meaning: "내가 남에게 잘해야 남도 내게 잘한다." },
      { saying: "아 다르고 어 다르다", meaning: "같은 내용도 말하기에 따라 느낌이 달라진다." },
    ],
  },
  {
    theme: "경계·교훈",
    items: [
      { saying: "소 잃고 외양간 고친다", meaning: "일이 잘못된 뒤에야 뒤늦게 손을 쓴다." },
      { saying: "우물 안 개구리", meaning: "넓은 세상을 모르고 견문이 좁다." },
      { saying: "등잔 밑이 어둡다", meaning: "가까이 있는 것을 오히려 잘 알지 못한다." },
      { saying: "원숭이도 나무에서 떨어진다", meaning: "아무리 익숙한 사람도 실수할 때가 있다." },
      { saying: "배보다 배꼽이 크다", meaning: "주된 것보다 딸린 것이 더 크다." },
      { saying: "돌다리도 두들겨 보고 건너라", meaning: "잘 아는 일도 세심히 살피고 조심하라." },
      { saying: "긁어 부스럼", meaning: "공연히 건드려서 도리어 화를 부른다." },
      { saying: "아는 길도 물어 가라", meaning: "잘 아는 일도 신중히 확인하고 조심하라." },
    ],
  },
  {
    theme: "인간관계·협력",
    items: [
      { saying: "백지장도 맞들면 낫다", meaning: "쉬운 일도 서로 힘을 합하면 더 낫다." },
      { saying: "가재는 게 편", meaning: "처지가 비슷한 사람끼리 서로 편을 든다." },
      { saying: "사공이 많으면 배가 산으로 간다", meaning: "주관하는 사람이 많으면 일이 엉뚱하게 된다." },
    ],
  },
  {
    theme: "세태·이치",
    items: [
      { saying: "개천에서 용 난다", meaning: "변변찮은 환경에서 훌륭한 인물이 나온다." },
      { saying: "빈 수레가 요란하다", meaning: "실속 없는 사람이 겉으로 더 떠들어댄다." },
      { saying: "낫 놓고 기역 자도 모른다", meaning: "아주 무식함을 이르는 말." },
      { saying: "하룻강아지 범 무서운 줄 모른다", meaning: "철없이 함부로 덤빔을 이르는 말." },
      { saying: "될성부른 나무는 떡잎부터 알아본다", meaning: "잘될 사람은 어릴 때부터 남다른 데가 있다." },
    ],
  },
  {
    theme: "지혜·이치",
    items: [
      { saying: "호랑이도 제 말 하면 온다", meaning: "이야기에 오르내리던 사람이 마침 나타난다." },
      { saying: "아니 땐 굴뚝에 연기 날까", meaning: "원인이 없으면 결과가 있을 수 없다." },
      { saying: "구슬이 서 말이라도 꿰어야 보배", meaning: "좋은 것도 다듬고 정리해야 쓸모가 있다." },
      { saying: "벼 이삭은 익을수록 고개를 숙인다", meaning: "교양·덕이 높을수록 겸손해진다." },
      { saying: "가랑비에 옷 젖는 줄 모른다", meaning: "사소한 것도 계속되면 크게 영향을 미친다." },
    ],
  },
  {
    theme: "관계·처세",
    items: [
      { saying: "원수는 외나무다리에서 만난다", meaning: "꺼리는 상대를 공교롭게 피할 수 없는 자리에서 만난다." },
      { saying: "믿는 도끼에 발등 찍힌다", meaning: "믿고 있던 사람에게 도리어 해를 입는다." },
      { saying: "고래 싸움에 새우 등 터진다", meaning: "강한 자들의 다툼에 약한 자가 피해를 본다." },
      { saying: "세 살 버릇 여든까지 간다", meaning: "어릴 때 몸에 밴 버릇은 늙어서도 고치기 어렵다." },
      { saying: "우물을 파도 한 우물을 파라", meaning: "한 가지 일을 끝까지 꾸준히 해야 성과가 있다." },
    ],
  },
  {
    theme: "삶·이치",
    items: [
      { saying: "쥐구멍에도 볕 들 날 있다", meaning: "몹시 어려운 처지에도 좋은 때가 온다." },
      { saying: "열 길 물속은 알아도 한 길 사람 속은 모른다", meaning: "사람의 속마음은 알기가 매우 어렵다." },
      { saying: "급할수록 돌아가라", meaning: "급할수록 정도를 밟아 침착하게 해야 한다." },
      { saying: "가는 날이 장날", meaning: "뜻하지 않은 일을 공교롭게 만난다." },
      { saying: "다 된 죽에 코 풀기", meaning: "거의 다 된 일을 어이없이 망친다." },
    ],
  },
  {
    theme: "말·인과",
    items: [
      { saying: "말 한마디에 천 냥 빚도 갚는다", meaning: "말을 잘하면 어려운 일도 해결할 수 있다." },
      { saying: "웃는 낯에 침 못 뱉는다", meaning: "좋게 대하는 사람에게는 함부로 하지 못한다." },
      { saying: "콩 심은 데 콩 나고 팥 심은 데 팥 난다", meaning: "모든 일은 원인에 따라 그에 맞는 결과가 나타난다." },
      { saying: "도둑이 제 발 저리다", meaning: "지은 죄가 있으면 스스로 조마조마해한다." },
      { saying: "지렁이도 밟으면 꿈틀한다", meaning: "아무리 약한 사람도 지나치게 몰면 반항한다." },
    ],
  },
  {
    theme: "정도·상황",
    items: [
      { saying: "하늘의 별 따기", meaning: "이루기가 매우 어려운 일." },
      { saying: "그림의 떡", meaning: "아무리 마음에 들어도 차지할 수 없는 것." },
      { saying: "밑 빠진 독에 물 붓기", meaning: "아무리 힘써도 보람이 없는 일." },
      { saying: "서당 개 삼 년이면 풍월을 읊는다", meaning: "오래 접하면 자연히 익히게 된다." },
      { saying: "뛰는 놈 위에 나는 놈 있다", meaning: "아무리 뛰어나도 그보다 나은 사람이 있다." },
    ],
  },
];

const FAQ = [
  {
    q: "속담이 시험에 자주 나오나요?",
    a: "네. KBS한국어능력시험의 어휘 영역과 한국실용글쓰기의 객관식에 속담·관용구가 꾸준히 출제됩니다. 뜻을 알고, 상황·문맥에 맞게 쓰였는지 판단하는 문제가 많아요.",
  },
  {
    q: "속담과 사자성어, 뭐부터 외우나요?",
    a: "둘 다 어휘 영역의 핵심이라 함께 익히는 게 좋아요. 주제별로 묶어 뜻을 정확히 외우고, 예문 속 쓰임으로 확인하면 실전에 강해집니다. 실글패스 CBT에서 유형별로 어휘 문제를 골라 연습할 수 있어요.",
  },
];

export default function ProverbsPage() {
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
            시험에 자주 나오는 속담
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            한국실용글쓰기·KBS한국어능력시험 어휘 영역에 자주 나오는 <strong className="text-[#334155]">속담을 주제별로</strong> 뜻과 함께 정리했어요.
            글자 그대로의 뜻과 상황 속 쓰임을 같이 익히면 문맥 문제에 강해집니다.
          </p>

          {GROUPS.map((g, gi) => (
            <Fragment key={g.theme}>
            <section className="mb-8">
              <h2 className="text-2xl font-black text-[#0f172a] mb-3">{g.theme}</h2>
              <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
                <table className="w-full text-sm">
                  <tbody>
                    {g.items.map((it) => (
                      <tr key={it.saying} className="border-t border-[#e2e8f0] first:border-t-0">
                        <td className="px-3 py-2.5 align-top font-bold text-[#1e3a5f]">{it.saying}</td>
                        <td className="px-3 py-2.5 text-[#475569] leading-relaxed">{it.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {/* 읽고 끝나지 않게 — 첫 묶음을 본 직후, 아직 페이지를 떠나기 전에 */}
            {gi === 0 && <TopicQuiz topic="proverbs" />}
            </Fragment>
          ))}

          {/* CTA */}
          <section className="mb-10 mt-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">어휘는 ‘문제로 풀어야’ 는다</p>
              <p className="text-white/70 text-sm mb-5">속담·사자성어·어휘 문제를 실전 CBT로 유형별로 연습하세요. 실용글쓰기·KBS한국어 모두 모의고사는 무료로 시작할 수 있어요.</p>
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
            <Link href="/idioms" className="underline hover:text-[#1e3a5f]">사자성어 모음</Link>
            {" · "}
            <Link href="/expressions" className="underline hover:text-[#1e3a5f]">관용구 모음</Link>
            {" · "}
            <Link href="/spelling" className="underline hover:text-[#1e3a5f]">자주 틀리는 맞춤법</Link>
            {" · "}
            <Link href="/kbs-korean" className="underline hover:text-[#1e3a5f]">KBS한국어 시험정보</Link>
            {" · "}
            <Link href="/exam-info" className="underline hover:text-[#1e3a5f]">실용글쓰기 시험정보</Link>
          </section>
          <RelatedBlogPosts category="grammar" seed="proverbs" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="속담 모음" path="/proverbs" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
