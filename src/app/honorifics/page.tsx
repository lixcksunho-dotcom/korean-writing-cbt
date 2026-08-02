import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'
import TopicQuiz from '@/components/study/TopicQuiz'

export const metadata: Metadata = {
  title: "높임법 바로 쓰기 — 높임 어휘·사물 존대(과잉 높임) 오류 정리",
  description:
    "헷갈리는 높임법을 한눈에. 진지·연세·성함 같은 높임 어휘와 ‘커피 나오셨습니다’ 같은 사물 존대(과잉 높임) 오류를 바르게 고치는 법을 정리했어요. KBS한국어능력시험·한국실용글쓰기 어법 대비.",
  keywords: [
    "높임법", "높임말", "존댓말", "사물 존대", "과잉 높임",
    "간접 높임", "높임 표현", "KBS한국어 높임법", "높임 어휘",
  ],
  alternates: { canonical: "/honorifics" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "높임법 바로 쓰기 — 높임 어휘·사물 존대 오류 정리",
    description: "높임 어휘와 ‘커피 나오셨습니다’ 같은 사물 존대 오류를 바르게 고치는 법.",
    url: "/honorifics",
    type: "website",
  },
};

type Word = { plain: string; high: string };
const WORDS: Word[] = [
  { plain: "밥", high: "진지" },
  { plain: "나이", high: "연세 / 춘추" },
  { plain: "이름", high: "성함 / 함자" },
  { plain: "말", high: "말씀" },
  { plain: "집", high: "댁" },
  { plain: "있다", high: "계시다" },
  { plain: "먹다 / 마시다", high: "잡수시다 / 드시다" },
  { plain: "자다", high: "주무시다" },
  { plain: "아프다", high: "편찮으시다" },
  { plain: "죽다", high: "돌아가시다" },
  { plain: "주다", high: "드리다 (내가 윗사람에게)" },
  { plain: "묻다", high: "여쭈다 / 여쭙다" },
  { plain: "보다 / 만나다", high: "뵈다 / 뵙다" },
  { plain: "데리다", high: "모시다" },
  { plain: "생일", high: "생신" },
  { plain: "병", high: "병환" },
  { plain: "술", high: "약주" },
  { plain: "이(치아)", high: "치아" },
  { plain: "딸 / 아들", high: "따님 / 아드님" },
  { plain: "노인 / 늙은이", high: "어르신" },
  { plain: "이 사람", high: "이분" },
  { plain: "누구", high: "어느 분" },
];

type Err = { bad: string; good: string; why: string };
const ERRORS: Err[] = [
  { bad: "커피 나오셨습니다", good: "커피 나왔습니다", why: "커피는 높임의 대상이 아니에요. 사물에는 ‘-시-’를 붙이지 않아요." },
  { bad: "포장이세요?", good: "포장하시겠어요? / 포장해 드릴까요?", why: "‘포장’은 사물·행위라 높일 수 없어요. 손님의 행위를 높여 표현해요." },
  { bad: "품절이세요", good: "품절입니다", why: "‘품절’은 사물의 상태예요. 상태에 ‘-세요’를 붙이면 안 돼요." },
  { bad: "가격이 5천 원이세요", good: "가격이 5천 원입니다", why: "가격은 높임 대상이 아니에요. ‘-이세요’는 사람을 높일 때만." },
  { bad: "사이즈가 없으세요", good: "사이즈가 없습니다", why: "물건이 없는 것이라 ‘없으세요’(높임)가 아니라 ‘없습니다’." },
  { bad: "주문하신 음료 나오셨어요", good: "주문하신 음료 나왔습니다", why: "음료는 높일 수 없어요. 사물 존대는 대표적인 과잉 높임 오류예요." },
  { bad: "총 3만 원 되시겠습니다", good: "총 3만 원입니다", why: "금액은 높임 대상이 아니에요. ‘되시다’로 높이면 안 돼요." },
  { bad: "거스름돈이세요", good: "거스름돈입니다 / 여기 있습니다", why: "거스름돈은 사물이라 ‘-이세요’로 높일 수 없어요." },
  { bad: "이쪽으로 오실게요", good: "이쪽으로 오시면 됩니다 / 오세요", why: "‘-ㄹ게요’는 말하는 사람의 의지를 나타내요. 손님의 행동에는 쓸 수 없어요." },
  { bad: "이 제품 좋으세요", good: "이 제품 좋습니다", why: "제품은 사물이라 ‘좋으세요’로 높일 수 없어요." },
  { bad: "20분 정도 걸리세요", good: "20분 정도 걸립니다", why: "걸리는 시간은 높임 대상이 아니에요." },
  { bad: "사이즈 딱이세요", good: "사이즈가 딱 맞습니다", why: "사이즈(사물)에 ‘-이세요’를 붙이면 안 돼요." },
  { bad: "반품 안 되십니다", good: "반품이 안 됩니다", why: "반품 규정·처리는 사물·상황이라 ‘-되십니다’로 높일 수 없어요." },
];

const RULES = [
  { name: "주체 높임", desc: "문장의 주어(행위 주체)를 높인다. 서술어에 ‘-(으)시-’를 붙이거나 높임 어휘를 쓴다.", ex: "할아버지께서 신문을 읽으신다." },
  { name: "객체 높임", desc: "목적어·부사어가 가리키는 대상(객체)을 높인다. ‘드리다·모시다·여쭈다·뵙다’ 같은 특수 어휘로.", ex: "나는 선생님께 책을 드렸다." },
  { name: "상대 높임", desc: "듣는 사람(상대)을 높이거나 낮춘다. 종결 어미로 표현한다.", ex: "안녕히 가십시오. / 안녕히 가세요." },
  { name: "간접 높임", desc: "높일 대상의 신체·소유물·생각 등을 높여 그 사람을 간접적으로 높인다. 사물 자체를 높이는 과잉 높임과 구별해야 한다.", ex: "할머니는 귀가 밝으시다. (O) / 말씀이 있으시다. (O)" },
];

const FAQ = [
  {
    q: "‘커피 나오셨습니다’는 왜 틀린 표현인가요?",
    a: "커피는 높임의 대상이 아니기 때문이에요. 높임 선어말어미 ‘-시-’는 사람(주체)을 높일 때 씁니다. 사물·상태·가격 등을 ‘-세요/-시-’로 높이는 것은 대표적인 ‘사물 존대(과잉 높임)’ 오류예요. ‘커피 나왔습니다’가 바른 표현입니다.",
  },
  {
    q: "‘있으시다’와 ‘계시다’는 어떻게 구분하나요?",
    a: "주체를 직접 높일 때는 ‘계시다’(할아버지께서 방에 계시다), 높일 대상의 소유물·생각 등을 간접적으로 높일 때는 ‘있으시다’(할아버지께서는 걱정이 있으시다)를 씁니다. ‘말씀이 계시다’(X)→‘말씀이 있으시다’(O).",
  },
];

export default function HonorificsPage() {
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
            높임법 바로 쓰기
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            높임 어휘와 <strong className="text-[#334155]">사물 존대(과잉 높임)</strong> 오류를 바르게 고치는 법을 정리했어요.
            ‘커피 나오셨습니다’처럼 사물을 높이는 실수를 피하는 것이 핵심입니다.
          </p>

          {/* 과잉 높임 오류 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">자주 틀리는 사물 존대 (과잉 높임)</h2>
            <div className="space-y-2.5">
              {ERRORS.map((e) => (
                <div key={e.bad} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <p className="text-sm">
                    <span className="font-bold text-[#64748b] line-through">{e.bad}</span>
                    <span className="mx-1.5 text-[#64748b]">→</span>
                    <span className="font-black text-[#1e3a5f]">{e.good}</span>
                  </p>
                  <p className="mt-1 text-sm text-[#64748b] leading-relaxed">{e.why}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 읽고 끝나지 않게 — 읽은 자리에서 바로 풀어보고 실전으로 잇는다 */}
          <TopicQuiz topic="honorifics" />

          {/* 높임 어휘 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">높임 어휘</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2 text-left font-bold">보통말</th>
                    <th className="px-3 py-2 text-left font-bold">높임말</th>
                  </tr>
                </thead>
                <tbody>
                  {WORDS.map((w) => (
                    <tr key={w.plain} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2 text-[#64748b] align-top whitespace-nowrap">{w.plain}</td>
                      <td className="px-3 py-2 font-semibold text-[#1e3a5f]">{w.high}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 높임의 종류 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">높임의 종류</h2>
            <div className="space-y-2.5">
              {RULES.map((r) => (
                <div key={r.name} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <p className="font-black text-[#1e3a5f]">{r.name}</p>
                  <p className="mt-1 text-sm text-[#475569] leading-relaxed">{r.desc}</p>
                  <p className="mt-1 text-sm text-[#64748b]"><b>예</b> · {r.ex}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mb-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">높임법, 문제로 풀어야 굳는다</p>
              <p className="text-white/70 text-sm mb-5">실글패스 CBT의 ‘높임 표현 바로잡기’ 유형별 연습으로 사물 존대 오류를 잡아보세요. 모의고사는 무료로 시작할 수 있어요.</p>
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
            <Link href="/spelling" className="underline hover:text-[#1e3a5f]">자주 틀리는 맞춤법</Link>
            {" · "}
            <Link href="/business-writing" className="underline hover:text-[#1e3a5f]">공문서·이메일 예시</Link>
            {" · "}
            <Link href="/kbs-korean" className="underline hover:text-[#1e3a5f]">KBS한국어 시험정보</Link>
            {" · "}
            <Link href="/refined-words" className="underline hover:text-[#1e3a5f]">순화어 모음</Link>
          </section>
          <RelatedBlogPosts category="grammar" seed="honorifics" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="높임법" path="/honorifics" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
