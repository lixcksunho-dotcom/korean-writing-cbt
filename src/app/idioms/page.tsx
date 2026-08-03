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
  title: "시험에 자주 나오는 사자성어 모음 (뜻·풀이 정리)",
  description:
    "한국실용글쓰기·KBS한국어능력시험에 자주 나오는 사자성어를 주제별로 뜻과 함께 정리했어요. 노력·우정·처세·배움 등 핵심 한자성어를 한눈에 익히고, 실전 CBT로 어휘 문제를 연습하세요.",
  keywords: [
    "사자성어", "사자성어 모음", "사자성어 뜻", "한자성어", "고사성어",
    "시험 사자성어", "KBS한국어 사자성어", "실용글쓰기 어휘", "자주 나오는 사자성어",
  ],
  alternates: { canonical: "/idioms" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "시험에 자주 나오는 사자성어 모음 (뜻·풀이)",
    description: "노력·우정·처세·배움 등 핵심 사자성어를 주제별로 뜻과 함께 정리.",
    url: "/idioms",
    type: "website",
  },
};

// 뜻이 명확하고 널리 통용되는 사자성어만 엄선(모호·이설 있는 것 제외).
type Idiom = { ko: string; hanja: string; meaning: string };
type Group = { theme: string; items: Idiom[] };
const GROUPS: Group[] = [
  {
    theme: "노력·의지",
    items: [
      { ko: "우공이산", hanja: "愚公移山", meaning: "우직하게 꾸준히 하면 큰일도 이룰 수 있다." },
      { ko: "대기만성", hanja: "大器晩成", meaning: "큰 그릇은 늦게 이루어진다 — 크게 될 사람은 늦게 성공한다." },
      { ko: "절차탁마", hanja: "切磋琢磨", meaning: "옥돌을 갈고닦듯 학문·덕행을 힘써 닦는다." },
      { ko: "형설지공", hanja: "螢雪之功", meaning: "반딧불·눈빛으로 공부한 노력 — 고생하며 부지런히 공부한 보람." },
      { ko: "마부위침", hanja: "磨斧爲針", meaning: "도끼를 갈아 바늘을 만든다 — 끈기 있게 하면 못 이룰 일이 없다." },
      { ko: "주경야독", hanja: "晝耕夜讀", meaning: "낮에는 일하고 밤에는 공부한다 — 어려운 형편에도 부지런히 배운다." },
      { ko: "불철주야", hanja: "不撤晝夜", meaning: "밤낮을 가리지 않는다 — 조금도 쉬지 않고 힘써 일한다." },
    ],
  },
  {
    theme: "우정·관계",
    items: [
      { ko: "죽마고우", hanja: "竹馬故友", meaning: "대나무 말을 타던 벗 — 어릴 때부터 함께 자란 친구." },
      { ko: "관포지교", hanja: "管鮑之交", meaning: "관중과 포숙의 사귐 — 서로 깊이 이해하는 두터운 우정." },
      { ko: "막역지우", hanja: "莫逆之友", meaning: "서로 거스름이 없는 벗 — 허물없이 친한 친구." },
      { ko: "동병상련", hanja: "同病相憐", meaning: "같은 병을 앓는 사람끼리 서로 가엾게 여긴다." },
      { ko: "수어지교", hanja: "水魚之交", meaning: "물과 물고기의 사귐 — 떨어질 수 없이 매우 친밀한 사이." },
    ],
  },
  {
    theme: "처세·세태",
    items: [
      { ko: "새옹지마", hanja: "塞翁之馬", meaning: "인생의 화와 복은 미리 알 수 없다." },
      { ko: "전화위복", hanja: "轉禍爲福", meaning: "화가 바뀌어 오히려 복이 된다." },
      { ko: "고진감래", hanja: "苦盡甘來", meaning: "쓴 것이 다하면 단 것이 온다 — 고생 끝에 낙이 온다." },
      { ko: "감언이설", hanja: "甘言利說", meaning: "달콤한 말과 이로운 이야기 — 남을 꾀는 그럴듯한 말." },
      { ko: "표리부동", hanja: "表裏不同", meaning: "겉과 속이 다르다 — 마음과 언행이 일치하지 않는다." },
      { ko: "고육지책", hanja: "苦肉之策", meaning: "제 몸을 상해 가며 짜내는 계책 — 어려운 처지를 벗어나려 어쩔 수 없이 쓰는 방책." },
    ],
  },
  {
    theme: "배움·깨달음",
    items: [
      { ko: "온고지신", hanja: "溫故知新", meaning: "옛것을 익혀 새것을 안다." },
      { ko: "교학상장", hanja: "敎學相長", meaning: "가르치고 배우며 서로 성장한다." },
      { ko: "청출어람", hanja: "靑出於藍", meaning: "쪽에서 나온 푸른 물감이 쪽보다 푸르다 — 제자가 스승보다 낫다." },
      { ko: "괄목상대", hanja: "刮目相對", meaning: "눈을 비비고 다시 본다 — 실력이 크게 늘어 새롭게 대한다." },
      { ko: "타산지석", hanja: "他山之石", meaning: "다른 산의 돌 — 남의 잘못도 내 수양의 거울로 삼는다." },
      { ko: "수불석권", hanja: "手不釋卷", meaning: "손에서 책을 놓지 않는다 — 늘 부지런히 공부한다." },
      { ko: "위편삼절", hanja: "韋編三絶", meaning: "책 끈이 세 번 끊어지도록 읽는다 — 반복해 열심히 공부한다." },
    ],
  },
  {
    theme: "경계·교훈",
    items: [
      { ko: "유비무환", hanja: "有備無患", meaning: "미리 준비가 되어 있으면 근심이 없다." },
      { ko: "과유불급", hanja: "過猶不及", meaning: "지나친 것은 미치지 못한 것과 같다." },
      { ko: "자업자득", hanja: "自業自得", meaning: "자기가 저지른 일의 결과를 자기가 받는다." },
      { ko: "연목구어", hanja: "緣木求魚", meaning: "나무에 올라 물고기를 구한다 — 불가능한 일을 무리하게 하려 한다." },
      { ko: "사상누각", hanja: "沙上樓閣", meaning: "모래 위에 지은 누각 — 기초가 부실해 오래가지 못한다." },
      { ko: "개과천선", hanja: "改過遷善", meaning: "지난 잘못을 고쳐 착하게 바뀐다." },
      { ko: "발본색원", hanja: "拔本塞源", meaning: "뿌리를 뽑고 근원을 막는다 — 폐단의 근본 원인을 없앤다." },
    ],
  },
  {
    theme: "인간사·이치",
    items: [
      { ko: "역지사지", hanja: "易地思之", meaning: "처지를 바꾸어 상대편의 입장에서 생각한다." },
      { ko: "이심전심", hanja: "以心傳心", meaning: "마음에서 마음으로 뜻이 통한다." },
      { ko: "설상가상", hanja: "雪上加霜", meaning: "눈 위에 서리가 내린다 — 어려운 일이 잇따라 겹친다." },
      { ko: "금상첨화", hanja: "錦上添花", meaning: "비단 위에 꽃을 더한다 — 좋은 일에 좋은 일이 더해진다." },
      { ko: "소탐대실", hanja: "小貪大失", meaning: "작은 것을 탐하다가 큰 것을 잃는다." },
      { ko: "인과응보", hanja: "因果應報", meaning: "원인과 결과는 서로 맞물려 되돌아온다." },
      { ko: "어불성설", hanja: "語不成說", meaning: "말이 조금도 이치에 맞지 않는다." },
    ],
  },
  {
    theme: "태도·처지",
    items: [
      { ko: "일취월장", hanja: "日就月將", meaning: "나날이 다달이 자라거나 발전한다." },
      { ko: "아전인수", hanja: "我田引水", meaning: "내 논에 물 대기 — 자기에게만 이롭게 생각하거나 행동한다." },
      { ko: "침소봉대", hanja: "針小棒大", meaning: "바늘만 한 것을 몽둥이만 하다고 한다 — 작은 일을 크게 부풀린다." },
      { ko: "부화뇌동", hanja: "附和雷同", meaning: "줏대 없이 남의 의견을 그대로 따라 한다." },
      { ko: "사면초가", hanja: "四面楚歌", meaning: "사방이 적으로 둘러싸여 고립된 곤경에 빠진다." },
      { ko: "진퇴양난", hanja: "進退兩難", meaning: "나아갈 수도 물러설 수도 없는 어려운 처지." },
    ],
  },
  {
    theme: "관계·상태",
    items: [
      { ko: "자화자찬", hanja: "自畫自讚", meaning: "자기가 그린 그림을 스스로 칭찬한다 — 제 일을 스스로 자랑한다." },
      { ko: "유유상종", hanja: "類類相從", meaning: "같은 무리끼리 서로 사귀고 어울린다." },
      { ko: "일석이조", hanja: "一石二鳥", meaning: "돌 하나로 새 두 마리를 잡는다 — 한 가지 일로 두 이익을 얻는다." },
      { ko: "대동소이", hanja: "大同小異", meaning: "큰 차이 없이 거의 비슷하다." },
      { ko: "동상이몽", hanja: "同床異夢", meaning: "같은 자리에서 다른 꿈을 꾼다 — 겉은 같으나 속으로 딴생각을 한다." },
      { ko: "유명무실", hanja: "有名無實", meaning: "이름만 그럴듯하고 실속이 없다." },
    ],
  },
  {
    theme: "성품·판단",
    items: [
      { ko: "견물생심", hanja: "見物生心", meaning: "물건을 보면 가지고 싶은 욕심이 생긴다." },
      { ko: "다다익선", hanja: "多多益善", meaning: "많으면 많을수록 더 좋다." },
      { ko: "견강부회", hanja: "牽強附會", meaning: "이치에 맞지 않는 말을 억지로 끌어다 붙인다." },
      { ko: "교언영색", hanja: "巧言令色", meaning: "남의 환심을 사려고 말과 낯빛을 꾸민다." },
      { ko: "오리무중", hanja: "五里霧中", meaning: "짙은 안개 속처럼 일의 갈피를 잡을 수 없다." },
      { ko: "우유부단", hanja: "優柔不斷", meaning: "망설이기만 하고 결단을 내리지 못한다." },
    ],
  },
  {
    theme: "상황·정도",
    items: [
      { ko: "명실상부", hanja: "名實相符", meaning: "이름과 실상이 서로 꼭 들어맞는다." },
      { ko: "자초지종", hanja: "自初至終", meaning: "처음부터 끝까지의 과정이나 사정." },
      { ko: "시종일관", hanja: "始終一貫", meaning: "처음부터 끝까지 한결같이 함." },
      { ko: "십중팔구", hanja: "十中八九", meaning: "열 가운데 여덟아홉 — 거의 대부분." },
      { ko: "이구동성", hanja: "異口同聲", meaning: "여러 사람의 말이 한결같이 같다." },
      { ko: "노심초사", hanja: "勞心焦思", meaning: "몹시 마음을 쓰며 애를 태운다." },
      { ko: "조족지혈", hanja: "鳥足之血", meaning: "새 발의 피 — 매우 적은 분량." },
    ],
  },
  {
    theme: "융통·경계",
    items: [
      { ko: "각주구검", hanja: "刻舟求劍", meaning: "배에 표시하고 칼을 찾는다 — 낡은 방식만 고집해 사리에 어둡다." },
      { ko: "백년하청", hanja: "百年河淸", meaning: "황하가 맑기를 기다린다 — 아무리 기다려도 이루어지기 어렵다." },
      { ko: "수주대토", hanja: "守株待兎", meaning: "그루터기를 지키며 토끼를 기다린다 — 요행만 바라 융통성이 없다." },
    ],
  },
];

const FAQ = [
  {
    q: "사자성어가 시험에 얼마나 나오나요?",
    a: "KBS한국어능력시험의 어휘 영역과 한국실용글쓰기의 객관식(어휘·어법)에 한자성어·속담·관용구가 꾸준히 출제됩니다. 뜻을 정확히 알고, 문맥에 맞게 쓰이는지 판단하는 문제가 많아요.",
  },
  {
    q: "사자성어는 어떻게 외우는 게 좋나요?",
    a: "글자 그대로의 뜻(직역)과 실제 쓰이는 의미(비유)를 함께 익히면 오래 기억됩니다. 주제별(노력·우정·처세 등)로 묶어 외우고, 예문 속에서 확인하면 실전 문제에 강해져요. 실글패스 CBT에서 유형별로 어휘 문제를 골라 연습할 수 있습니다.",
  },
];

export default function IdiomsPage() {
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
            시험에 자주 나오는 사자성어
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            한국실용글쓰기·KBS한국어능력시험 어휘 영역에 자주 나오는 <strong className="text-[#334155]">사자성어를 주제별로</strong> 뜻과 함께 정리했어요.
            글자 뜻과 실제 쓰임을 같이 익히면 문맥 문제에 강해집니다.
          </p>

          {GROUPS.map((g, gi) => (
            <Fragment key={g.theme}>
            <section className="mb-8">
              <h2 className="text-2xl font-black text-[#0f172a] mb-3">{g.theme}</h2>
              <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
                <table className="w-full text-sm">
                  <tbody>
                    {g.items.map((it) => (
                      <tr key={it.ko} className="border-t border-[#e2e8f0] first:border-t-0">
                        <td className="px-3 py-2.5 align-top whitespace-nowrap">
                          <span className="font-black text-[#1e3a5f]">{it.ko}</span>
                          <span className="ml-1.5 text-xs text-[#64748b]">{it.hanja}</span>
                        </td>
                        <td className="px-3 py-2.5 text-[#475569] leading-relaxed">{it.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {/* 읽고 끝나지 않게 — 첫 묶음을 본 직후, 아직 페이지를 떠나기 전에 */}
            {gi === 0 && <TopicQuiz topic="idioms" />}
            </Fragment>
          ))}

          {/* CTA */}
          <section className="mb-10 mt-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">어휘는 ‘문제로 풀어야’ 는다</p>
              <p className="text-white/70 text-sm mb-5">사자성어·속담·어휘 문제를 실전 CBT로 유형별로 연습하세요. 실용글쓰기·KBS한국어 모두 모의고사는 무료로 시작할 수 있어요.</p>
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
            <Link href="/proverbs" className="underline hover:text-[#1e3a5f]">속담 모음</Link>
            {" · "}
            <Link href="/expressions" className="underline hover:text-[#1e3a5f]">관용구 모음</Link>
            {" · "}
            <Link href="/spelling" className="underline hover:text-[#1e3a5f]">자주 틀리는 맞춤법</Link>
            {" · "}
            <Link href="/kbs-korean" className="underline hover:text-[#1e3a5f]">KBS한국어 시험정보</Link>
            {" · "}
            <Link href="/exam-info" className="underline hover:text-[#1e3a5f]">실용글쓰기 시험정보</Link>
            {" · "}
            <Link href="/exam-compare" className="underline hover:text-[#1e3a5f]">실용글쓰기·KBS 비교</Link>
          </section>
          <RelatedBlogPosts category="grammar" seed="idioms" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="사자성어 모음" path="/idioms" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
