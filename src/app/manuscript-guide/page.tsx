import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";

export const metadata: Metadata = {
  title: "원고지 작성법 — 칸 쓰는 법·문장부호·띄어쓰기 총정리",
  description:
    "원고지 쓰는 법을 한눈에. 한 칸에 한 글자, 숫자·알파벳 칸 나누기, 마침표·쉼표·따옴표 등 문장부호 처리, 들여쓰기와 줄 끝 규칙까지. 한국실용글쓰기 원고지 서술형 답안 작성에 바로 쓰는 표준 규정 정리.",
  keywords: [
    "원고지 작성법", "원고지 쓰는 법", "원고지 사용법", "원고지 띄어쓰기",
    "원고지 문장부호", "원고지 숫자", "원고지 칸", "원고지 들여쓰기",
    "실용글쓰기 원고지", "원고지 서술형",
  ],
  alternates: { canonical: "/manuscript-guide" },
  openGraph: {
    title: "원고지 작성법 — 칸·문장부호·띄어쓰기 총정리",
    description: "한 칸 한 글자, 숫자·알파벳, 문장부호, 들여쓰기까지 원고지 표준 규정을 정리했어요.",
    url: "/manuscript-guide",
    type: "website",
  },
};

// 표준 원고지 사용법(학교·검정 공통 규정) 중 확실한 항목만 정리.
type Rule = { topic: string; rule: string; ex: string };
const BASICS: Rule[] = [
  { topic: "한 칸에 한 글자", rule: "한글·한자는 한 글자를 한 칸에 쓴다", ex: "'글쓰기' → 글 / 쓰 / 기 (세 칸)" },
  { topic: "들여쓰기", rule: "문단이 시작될 때는 첫 칸을 비우고 둘째 칸부터 쓴다", ex: "새 문단은 언제나 한 칸 들여쓰기" },
  { topic: "띄어쓰기 = 빈 칸", rule: "띄어 쓸 자리는 한 칸을 비운다", ex: "'나는 학생' → 나 는 □ 학 생" },
  { topic: "줄 바꿀 때", rule: "문단이 끝나 줄을 바꾸면, 다음 문단도 첫 칸을 비우고 시작", ex: "이어지는 내용이면 줄만 바꾸고 첫 칸부터" },
];

type Punc = { mark: string; how: string };
const PUNCT: Punc[] = [
  { mark: "마침표 . / 쉼표 ,", how: "각각 한 칸을 차지한다. 단, 문장부호 뒤에는 칸을 비우지 않고 바로 다음 글자를 쓴다." },
  { mark: "물음표 ? / 느낌표 !", how: "한 칸을 차지하고, 뒤에 이어 쓸 때는 한 칸 비우고 다음 글자를 쓴다." },
  { mark: "따옴표 “ ” ‘ ’", how: "여는 따옴표·닫는 따옴표 각각 한 칸씩 차지한다." },
  { mark: "괄호 ( )", how: "여는 괄호·닫는 괄호 각각 한 칸씩 차지한다." },
  { mark: "말줄임표 ……", how: "가운뎃점 여섯 개를 한 칸에 세 개씩, 두 칸에 나누어 쓴다." },
  { mark: "줄 끝 마침표·쉼표", how: "문장부호는 줄의 첫 칸에 올 수 없다. 줄 끝이면 마지막 칸 안에 글자와 함께 쓰거나 칸 밖(오른쪽 여백)에 쓴다." },
];

type Cell = { kind: string; rule: string; ex: string };
const NUMLETTER: Cell[] = [
  { kind: "아라비아 숫자", rule: "두 자리씩 한 칸에 쓴다", ex: "2024 → 20 / 24 (두 칸)" },
  { kind: "알파벳 대문자", rule: "한 칸에 한 자씩 쓴다", ex: "KBS → K / B / S (세 칸)" },
  { kind: "알파벳 소문자", rule: "한 칸에 두 자씩 쓴다", ex: "test → te / st (두 칸)" },
  { kind: "한 자리 숫자·단독 알파벳", rule: "한 칸에 한 자를 쓴다", ex: "5월 → 5 / 월" },
];

const DIALOGUE = [
  "대화(직접 인용)는 줄을 바꾸어 첫 칸을 비우고 여는 따옴표부터 쓴다.",
  "한 사람의 말이 끝나면 줄을 바꾸고, 다음 사람의 말도 새 줄에서 시작한다.",
  "인용문이 길어 여러 줄이 되어도, 이어지는 줄은 첫 칸을 비우지 않고 왼쪽 끝(첫 칸)부터 채운다.",
];

// 규정은 알아도 답안에서 자주 놓치는 실수 — 채점 감점으로 직결된다.
const MISTAKES = [
  { bad: "들여쓰기를 빠뜨림", fix: "새 문단은 반드시 첫 칸을 비우고 둘째 칸부터 시작한다. 첫 문단도 예외가 아니다." },
  { bad: "숫자를 한 칸에 한 자씩", fix: "아라비아 숫자는 두 자리씩 한 칸에 쓴다. '2024'를 네 칸에 쓰면 규정 위반." },
  { bad: "띄어쓰기 칸을 안 비움", fix: "띄어 쓸 자리는 한 칸을 비운다. 칸을 아끼려 붙여 쓰면 안 된다." },
  { bad: "문장부호를 줄 첫 칸에", fix: "마침표·쉼표는 줄 첫 칸에 올 수 없다. 앞 줄 마지막 칸이나 칸 밖에 처리한다." },
  { bad: "제한 글자 수 무시", fix: "칸을 세어 목표 분량을 미리 표시하고, 제한을 크게 넘거나 못 미치지 않도록 맞춘다." },
];

// 논술·독후감 등 제목·이름을 갖춘 글을 원고지에 쓸 때의 규정(실용글쓰기 서술형은 대개 본문만).
const TITLE_RULES = [
  { part: "제목", how: "첫째 줄은 비우고 둘째 줄 가운데에 쓴다. 제목 앞뒤로 남는 칸을 비슷하게 맞춘다." },
  { part: "이름", how: "제목 다음 줄에, 오른쪽 끝에서 두세 칸을 비우고 쓴다. 성과 이름은 붙여 쓴다." },
  { part: "소속·번호", how: "필요하면 이름 윗줄에 오른쪽으로 맞추어 적는다." },
  { part: "본문 시작", how: "이름 다음 한 줄을 비우고, 첫 문단은 첫 칸을 들여 시작한다." },
];

const FAQ = [
  {
    q: "원고지에서 띄어쓰기는 어떻게 표시하나요?",
    a: "띄어 쓸 자리를 한 칸 비워 두면 됩니다. 예를 들어 '나는 학생이다'는 '나/는/□/학/생/이/다'처럼 '는'과 '학' 사이 한 칸을 비웁니다. 문단이 시작될 때만 첫 칸을 비우는 들여쓰기와는 다른 규칙이에요.",
  },
  {
    q: "마침표가 줄 맨 앞 칸에 오면 어떻게 하나요?",
    a: "문장부호는 줄의 첫 칸에 오지 않습니다. 마침표·쉼표가 줄 끝에 걸리면 앞 줄 마지막 칸 안에 글자와 함께 쓰거나, 칸 바깥(오른쪽 여백)에 적습니다.",
  },
  {
    q: "원고지 작성이 실용글쓰기 시험에 나오나요?",
    a: "네. 한국실용글쓰기 서술형·논술형 답안은 원고지 형식으로 쓰며, 들여쓰기·띄어쓰기 칸·문장부호 처리 같은 원고지 규정이 채점에 반영됩니다. 실글패스의 원고지 채점에서 실제로 칸을 채워 답안을 쓰고, AI가 규정 준수와 표현까지 첨삭해 줍니다.",
  },
];

export default function ManuscriptGuidePage() {
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
            원고지 작성법
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            한 칸에 한 글자, 문장부호 한 칸, 숫자·알파벳 칸 나누기, 들여쓰기까지 —{" "}
            <strong className="text-[#334155]">원고지 쓰는 법의 표준 규정</strong>을 한눈에 정리했어요.
            한국실용글쓰기 원고지 서술형 답안은 이 규정을 지켜야 감점을 피할 수 있습니다.
          </p>

          {/* 기본 규칙 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">기본 규칙</h2>
            <div className="space-y-2.5">
              {BASICS.map((r) => (
                <div key={r.topic} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-black text-[#1e3a5f]">{r.topic}</span>
                    <span className="text-sm font-semibold text-[#334155]">{r.rule}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#64748b] leading-relaxed">{r.ex}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 문장부호 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">문장부호 쓰는 법</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <tbody>
                  {PUNCT.map((p) => (
                    <tr key={p.mark} className="border-t border-[#e2e8f0] first:border-t-0">
                      <td className="px-3 py-2.5 font-bold text-[#0f172a] whitespace-nowrap align-top">{p.mark}</td>
                      <td className="px-3 py-2.5 text-[#64748b] leading-relaxed">{p.how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 숫자·알파벳 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">숫자·알파벳 칸 나누기</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2.5 text-left font-bold">구분</th>
                    <th className="px-3 py-2.5 text-left font-bold">규칙</th>
                    <th className="px-3 py-2.5 text-left font-bold">예</th>
                  </tr>
                </thead>
                <tbody>
                  {NUMLETTER.map((c) => (
                    <tr key={c.kind} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2.5 font-bold text-[#1e3a5f] whitespace-nowrap align-top">{c.kind}</td>
                      <td className="px-3 py-2.5 text-[#334155] leading-relaxed">{c.rule}</td>
                      <td className="px-3 py-2.5 text-[#64748b] whitespace-nowrap align-top">{c.ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 대화·인용 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">대화·인용 쓰는 법</h2>
            <ul className="space-y-2.5">
              {DIALOGUE.map((d) => (
                <li key={d} className="rounded-xl border border-[#e2e8f0] bg-white p-4 text-sm text-[#475569] leading-relaxed">
                  {d}
                </li>
              ))}
            </ul>
          </section>

          {/* 자주 하는 실수 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">자주 하는 실수</h2>
            <div className="space-y-2.5">
              {MISTAKES.map((m) => (
                <div key={m.bad} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <p className="font-black text-red-500 text-sm">✕ {m.bad}</p>
                  <p className="mt-1 text-sm text-[#475569] leading-relaxed">{m.fix}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 제목·이름 쓰기 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">제목·이름 쓰기 <span className="text-sm font-semibold text-[#94a3b8]">(논술·독후감 등)</span></h2>
            <div className="space-y-2.5">
              {TITLE_RULES.map((t) => (
                <div key={t.part} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <p className="font-black text-[#1e3a5f]">{t.part}</p>
                  <p className="mt-1 text-sm text-[#475569] leading-relaxed">{t.how}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#94a3b8]">※ 한국실용글쓰기 서술형은 대개 제목·이름 없이 본문만 씁니다. 문제의 조건을 따르세요.</p>
          </section>

          {/* CTA — 원고지 AI 첨삭(유료 핵심 기능)으로 유도 */}
          <section className="mb-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">규정은 눈으로, 실력은 손으로</p>
              <p className="text-white/70 text-sm mb-5">실글패스의 원고지 채점에서 실제 칸을 채워 답안을 쓰고, AI가 원고지 규정 준수부터 내용·표현까지 첨삭해 줍니다. 무료로 체험해 보세요.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/manuscript" className="btn-gold inline-flex items-center justify-center gap-1.5 text-white font-bold py-3 px-6 rounded-xl text-sm">
                  원고지 AI 첨삭 받아보기
                </Link>
                <Link href="/cbt" className="inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm bg-white/10 text-white border border-white/20 hover:bg-white/15 transition-colors">
                  무료 CBT 모의고사
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
            <Link href="/essay-guide" className="underline hover:text-[#1e3a5f]">서술형 답안 작성법</Link>
            {" · "}
            <Link href="/spelling" className="underline hover:text-[#1e3a5f]">자주 틀리는 맞춤법</Link>
            {" · "}
            <Link href="/word-counter" className="underline hover:text-[#1e3a5f]">글자수 세기</Link>
            {" · "}
            <Link href="/exam-info" className="underline hover:text-[#1e3a5f]">시험정보</Link>
          </section>
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="원고지 사용법" path="/manuscript-guide" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
