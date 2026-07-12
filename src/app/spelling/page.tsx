import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "자주 틀리는 맞춤법·띄어쓰기 모음 — 헷갈리는 표기 총정리",
  description:
    "되/돼, 안/않, 왠/웬, 며칠, 오랜만에, 금세… 자주 틀리는 맞춤법과 띄어쓰기를 틀림→바름으로 한눈에 정리했어요. 한국실용글쓰기·자소서·보고서 글쓰기에 바로 쓰는 맞춤법 총정리.",
  keywords: [
    "맞춤법", "띄어쓰기", "자주 틀리는 맞춤법", "헷갈리는 맞춤법", "맞춤법 정리",
    "되 돼 구분", "안 않 구분", "왠 웬", "며칠 몇일", "맞춤법 검사",
  ],
  alternates: { canonical: "/spelling" },
  openGraph: {
    title: "자주 틀리는 맞춤법·띄어쓰기 모음",
    description: "되/돼, 안/않, 왠/웬, 며칠… 헷갈리는 표기를 틀림→바름으로 정리.",
    url: "/spelling",
    type: "website",
  },
};

// 표준어·한글맞춤법 기준으로 '확실한' 항목만 엄선(모호한 규칙 제외).
type Rule = { topic: string; correct: string; tip: string };
const RULES: Rule[] = [
  { topic: "되 / 돼", correct: "'돼'는 '되어'의 준말", tip: "'되어'로 바꿔 말이 되면 '돼'. 예: 안 돼(O)/안 되(X), 됐다(=되었다)." },
  { topic: "안 / 않", correct: "'안'은 부사, '않'은 '아니하'의 준말", tip: "'안 먹어'(O), '먹지 않아'(O). '먹지 안아'(X)." },
  { topic: "-로서 / -로써", correct: "자격은 '로서', 수단은 '로써'", tip: "학생으로서(자격), 대화로써(수단·도구)." },
  { topic: "왠 / 웬", correct: "'왠지'만 '왠', 나머지는 '웬'", tip: "왠지(=왜인지)(O), 웬일·웬만하면·웬 떡(O). 왠일(X)." },
  { topic: "-던 / -든", correct: "과거 회상은 '던', 선택은 '든'", tip: "가던 길(회상), 가든 말든(선택)." },
  { topic: "-예요 / -이에요", correct: "받침 없으면 '예요', 있으면 '이에요'", tip: "뭐예요(O), 책이에요(O), 거예요(O)." },
  { topic: "-ㄹ게 / -ㄹ께", correct: "소리는 [께]라도 '게'로 적음", tip: "할게(O)/할께(X), 갈게(O)/갈께(X)." },
  { topic: "하려고 / 할려고", correct: "'하려고'가 표준", tip: "먹으려고(O)/먹을려고(X), 가려고(O)/갈려고(X)." },
  { topic: "봬요 / 뵈요", correct: "'봬요'(=뵈어요)가 맞음", tip: "내일 봬요(O), 봤다→'뵀다'. '뵈요'(X)." },
];

type Fix = { wrong: string; right: string };
const FIXES: Fix[] = [
  { wrong: "몇일", right: "며칠" },
  { wrong: "오랫만에", right: "오랜만에" },
  { wrong: "어의없다", right: "어이없다" },
  { wrong: "금새", right: "금세" },
  { wrong: "왠만하면", right: "웬만하면" },
  { wrong: "설레임 / 설레이다", right: "설렘 / 설레다" },
  { wrong: "바램(소망)", right: "바람" },
  { wrong: "역활", right: "역할" },
  { wrong: "궂이 / 구지", right: "굳이" },
  { wrong: "희안하다", right: "희한하다" },
  { wrong: "안절부절하다", right: "안절부절못하다" },
  { wrong: "쉽상", right: "십상" },
  { wrong: "서슴치 않다", right: "서슴지 않다" },
  { wrong: "갯수", right: "개수" },
  { wrong: "내노라하다", right: "내로라하다" },
  { wrong: "곱배기", right: "곱빼기" },
  { wrong: "뒤쳐지다(뒤떨어지다 뜻)", right: "뒤처지다" },
  { wrong: "담궜다 / 잠궜다", right: "담갔다 / 잠갔다" },
  { wrong: "치뤘다", right: "치렀다" },
  { wrong: "설겆이", right: "설거지" },
  { wrong: "김치찌게", right: "김치찌개" },
  { wrong: "육계장", right: "육개장" },
  { wrong: "돌맹이", right: "돌멩이" },
  { wrong: "요세", right: "요새" },
];

type Pair = { a: string; b: string; how: string };
const PAIRS: Pair[] = [
  { a: "낫다", b: "낳다 / 났다", how: "낫다=병이 회복·더 좋다, 낳다=출산, 났다=생겨나다." },
  { a: "가르치다", b: "가리키다", how: "가르치다=교육하다, 가리키다=방향·대상을 지시하다." },
  { a: "다르다", b: "틀리다", how: "다르다=같지 않다(different), 틀리다=맞지 않다(wrong)." },
  { a: "잊어버리다", b: "잃어버리다", how: "잊다=기억에서 사라짐, 잃다=물건 등을 분실함." },
  { a: "맞히다", b: "맞추다", how: "맞히다=정답을 맞게 하다, 맞추다=서로 비교·조립·대다." },
  { a: "붙이다", b: "부치다", how: "붙이다=달라붙게 하다, 부치다=편지를 보내다·힘이 부치다." },
  { a: "반드시", b: "반듯이", how: "반드시=꼭(必), 반듯이=곧고 바르게." },
  { a: "-장이", b: "-쟁이", how: "기술자는 '-장이'(미장이), 성질·특징은 '-쟁이'(겁쟁이)." },
];

type Space = { ex: string; note: string };
const SPACES: Space[] = [
  { ex: "할 수 있다 (O)", note: "'수'는 의존명사라 띄어 써요. '할수있다'(X)." },
  { ex: "그러면 안 돼요 (O)", note: "부정의 '안'은 띄어 써요. '안돼요'(X)." },
  { ex: "한 번 / 한번", note: "횟수는 '한 번'(한 번 더), 시도·기회는 '한번'(한번 해 봐)." },
  { ex: "너밖에 없다 (O)", note: "'밖에'는 조사라 붙여 써요. '너 밖에'(X)." },
  { ex: "이 외에 / 그 외에", note: "'외'는 명사라 앞말과 띄어요." },
  { ex: "좀 더 (O)", note: "'좀'과 '더'는 각각 부사라 띄어 써요." },
];

const FAQ = [
  { q: "'되'와 '돼'는 어떻게 구분하나요?", a: "'돼'는 '되어'의 준말이에요. 자리에 '되어'를 넣어 말이 되면 '돼', 안 되면 '되'입니다. 예: '안 돼'(='안 되어'), '됐다'(='되었다'), 문장 끝은 대부분 '돼'." },
  { q: "'왠지'와 '웬지' 중 뭐가 맞나요?", a: "'왠지'가 맞아요('왜인지'의 준말). 그 외에는 모두 '웬'을 씁니다. 웬일, 웬만하면, 웬 떡이야." },
  { q: "맞춤법이 시험에도 나오나요?", a: "네. 한국실용글쓰기의 객관식(선택형)에 어휘·어법·맞춤법이 자주 나오고, 서술형에서도 표기 정확성이 채점에 반영돼요. 실글패스에서 유형별로 맞춤법 문제를 골라 연습하고, 서술형은 AI 첨삭으로 표기 오류까지 짚어볼 수 있어요." },
];

export default function SpellingPage() {
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
            자주 틀리는 맞춤법·띄어쓰기
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            되/돼, 안/않, 왠/웬, 며칠, 오랜만에… <strong className="text-[#334155]">헷갈리는 표기를 틀림→바름</strong>으로 정리했어요.
            자소서·보고서·한국실용글쓰기 서술형까지, 맞춤법 하나로 글의 인상이 달라집니다.
          </p>

          {/* 헷갈리는 규칙 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">헷갈리는 맞춤법 규칙</h2>
            <div className="space-y-2.5">
              {RULES.map((r) => (
                <div key={r.topic} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-black text-[#1e3a5f]">{r.topic}</span>
                    <span className="text-sm font-semibold text-[#334155]">{r.correct}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#64748b] leading-relaxed">{r.tip}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 틀림 → 바름 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">자주 틀리는 표기 (틀림 → 바름)</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2.5 text-left font-bold">틀린 표기</th>
                    <th className="px-3 py-2.5 text-left font-bold">바른 표기</th>
                  </tr>
                </thead>
                <tbody>
                  {FIXES.map((f) => (
                    <tr key={f.wrong} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2.5 text-[#94a3b8] line-through">{f.wrong}</td>
                      <td className="px-3 py-2.5 font-bold text-[#1e3a5f]">{f.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 뜻이 다른 헷갈리는 단어 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">뜻이 다른 헷갈리는 단어</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <tbody>
                  {PAIRS.map((p) => (
                    <tr key={p.a} className="border-t border-[#e2e8f0] first:border-t-0">
                      <td className="px-3 py-2.5 font-bold text-[#0f172a] whitespace-nowrap align-top">{p.a} · {p.b}</td>
                      <td className="px-3 py-2.5 text-[#64748b] leading-relaxed">{p.how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 띄어쓰기 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">헷갈리는 띄어쓰기</h2>
            <div className="space-y-2.5">
              {SPACES.map((s) => (
                <div key={s.ex} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <p className="font-bold text-[#1e3a5f]">{s.ex}</p>
                  <p className="mt-1 text-sm text-[#64748b] leading-relaxed">{s.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mb-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">맞춤법, 문제로 풀어야 진짜 는다</p>
              <p className="text-white/70 text-sm mb-5">한국실용글쓰기 CBT에서 맞춤법·어법을 유형별로 연습하고, 서술형은 AI 첨삭으로 표기 오류까지 짚어보세요. 무료로 시작할 수 있어요.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/cbt" className="btn-gold inline-flex items-center justify-center gap-1.5 text-white font-bold py-3 px-6 rounded-xl text-sm">
                  무료 CBT 모의고사 풀어보기
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
            <Link href="/exam-info" className="underline hover:text-[#1e3a5f]">한국실용글쓰기 시험정보</Link>
            {" · "}
            <Link href="/word-counter" className="underline hover:text-[#1e3a5f]">글자수 세기</Link>
          </section>
        </div>
      </main>

      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
