import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import { SCHEDULE, SCHEDULE_URL, APPLY_URL } from "@/lib/examSchedule";
import { TIER_TABLE } from "@/lib/grade";
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'

export const metadata: Metadata = {
  title: "한국실용글쓰기 시험일정·등급·점수 총정리 (2026)",
  description:
    "한국실용글쓰기 시험일정(접수·시험·발표), 등급 기준(1급·2급·준2급·3급·준3급, 1000점 만점), 객관식·서술형 점수 구성, 응시 방법을 한눈에. 무료 CBT 모의고사로 지금 실력을 확인하세요.",
  keywords: [
    "한국실용글쓰기 시험일정", "한국실용글쓰기 등급", "한국실용글쓰기 점수",
    "한국실용글쓰기 급수", "한국실용글쓰기 준2급", "한국실용글쓰기 합격 기준",
    "한국실용글쓰기 시험 정보", "한국실용글쓰기 접수", "한국실용글쓰기 배점", "실용글쓰기 자격증",
  ],
  alternates: { canonical: "/exam-info" },
  openGraph: {
    title: "한국실용글쓰기 시험일정·등급·점수 총정리",
    description:
      "시험일정·등급 기준·점수 구성·응시 방법을 한눈에. 무료 CBT 모의고사로 실력 확인.",
    url: "/exam-info",
    type: "website",
  },
};

const WD = ["일", "월", "화", "수", "목", "금", "토"];
function fmt(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}.${m}.${d}(${wd})`;
}

const SCORE = [
  { area: "객관식(선택형)", detail: "어휘·어법·독해·화법 등 기초 문항", points: "300점" },
  { area: "서술형(작문)", detail: "요약·고쳐쓰기·안내문/이메일·원고지 작문 등", points: "700점" },
];

const FAQ = [
  {
    q: "한국실용글쓰기 시험은 몇 점 만점이고, 등급은 어떻게 나뉘나요?",
    a: "1000점 만점입니다. 환산 점수 기준으로 1급 870점, 2급 790점, 준2급 710점, 3급 630점, 준3급 550점 이상으로 등급이 부여됩니다. 공공기관·기업 가산점은 보통 2급·준2급 이상을 요구하는 경우가 많아요.",
  },
  {
    q: "객관식과 서술형 배점은 어떻게 되나요?",
    a: "크게 객관식(선택형) 300점, 서술형(작문) 700점으로 서술형 비중이 큽니다. 그래서 서술형 연습과 채점 피드백이 합격의 핵심이에요.",
  },
  {
    q: "시험 접수는 어디서 하나요?",
    a: `한국실용글쓰기검정 주관처 공식 사이트에서 회차별로 접수합니다. 접수 기간이 짧으니 위 일정표를 참고해 미리 준비하세요. (공식 일정: ${SCHEDULE_URL})`,
  },
  {
    q: "독학으로 준비해도 합격할 수 있나요?",
    a: "네. 유형별로 약점을 잡고, 서술형은 채점·첨삭 피드백을 받고, 실전처럼 CBT 모의고사로 시간 감각을 익히면 학원 없이도 충분히 합격할 수 있어요. 실글패스에서 무료로 모의고사 2회분을 풀어볼 수 있습니다.",
  },
];

export default function ExamInfoPage() {
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
            한국실용글쓰기 시험 정보
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            <strong className="text-[#334155]">시험일정·등급 기준·점수 구성·응시 방법</strong>을 한눈에 정리했어요.
            준비를 시작했다면 아래 무료 CBT 모의고사로 지금 실력을 먼저 확인해 보세요.
          </p>

          {/* 요약 박스 */}
          <div className="mb-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-[#fffbeb] to-[#fff7ed] p-5">
            <p className="text-sm text-[#475569] leading-relaxed">
              한국실용글쓰기검정은 <b className="text-[#1e3a5f]">1000점 만점</b>, 객관식(300점)+서술형(700점)으로 구성된
              국가공인 자격시험이에요. 환산 점수로 <b className="text-[#1e3a5f]">준3급(550)~1급(870)</b> 등급이 부여되고,
              공공기관·기업 가산점은 보통 <b className="text-[#1e3a5f]">2급·준2급 이상</b>을 봅니다.
            </p>
          </div>

          {/* 시험 일정 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">시험 일정</h2>
            <div className="overflow-x-auto rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2.5 text-left font-bold">회차</th>
                    <th className="px-3 py-2.5 text-left font-bold">접수 기간</th>
                    <th className="px-3 py-2.5 text-left font-bold">시험일</th>
                    <th className="px-3 py-2.5 text-left font-bold">발표일</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEDULE.map((r) => (
                    <tr key={r.round} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2.5 font-bold text-[#0f172a]">{r.round}</td>
                      <td className="px-3 py-2.5 text-[#475569]">{fmt(r.applyStart)} ~ {fmt(r.applyEnd)}</td>
                      <td className="px-3 py-2.5 font-semibold text-[#1e3a5f]">{fmt(r.examDate)}</td>
                      <td className="px-3 py-2.5 text-[#475569]">{fmt(r.resultDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-[#94a3b8]">
              일정은 주관처 사정으로 변경될 수 있어요. 접수는{" "}
              <a href={APPLY_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1e3a5f]">공식 접수처</a>,
              전체 일정은{" "}
              <a href={SCHEDULE_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1e3a5f]">공식 일정 페이지</a>에서 확인하세요.
            </p>
          </section>

          {/* 등급 기준 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">등급 기준 (1000점 만점)</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2.5 text-left font-bold">등급</th>
                    <th className="px-3 py-2.5 text-left font-bold">환산 점수(이상)</th>
                  </tr>
                </thead>
                <tbody>
                  {TIER_TABLE.map((t) => (
                    <tr key={t.name} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2.5 font-bold text-[#0f172a]">{t.name}</td>
                      <td className="px-3 py-2.5 text-[#475569]">{t.min}점 이상</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-[#94a3b8]">550점 미만은 등급이 부여되지 않아요.</p>
          </section>

          {/* 점수 구성 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">점수 구성</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2.5 text-left font-bold">영역</th>
                    <th className="px-3 py-2.5 text-left font-bold">내용</th>
                    <th className="px-3 py-2.5 text-right font-bold">배점</th>
                  </tr>
                </thead>
                <tbody>
                  {SCORE.map((s) => (
                    <tr key={s.area} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2.5 font-bold text-[#0f172a] whitespace-nowrap">{s.area}</td>
                      <td className="px-3 py-2.5 text-[#475569]">{s.detail}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[#1e3a5f] whitespace-nowrap">{s.points}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-[#e2e8f0] bg-[#f8fafc]">
                    <td className="px-3 py-2.5 font-black text-[#0f172a]">합계</td>
                    <td className="px-3 py-2.5 text-[#475569]">CBT 방식 · 약 120분</td>
                    <td className="px-3 py-2.5 text-right font-black text-[#0f172a]">1000점</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-[#94a3b8]">
              서술형(700점) 비중이 커서, 서술형 답안을 얼마나 조건에 맞게 쓰느냐가 등급을 가릅니다.
            </p>
          </section>

          {/* 준비 전략 + CTA */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">어떻게 준비할까요?</h2>
            <p className="text-[#475569] leading-relaxed mb-4">
              배점이 큰 <strong className="text-[#334155]">서술형</strong>은 혼자 채점하기 어렵다는 게 가장 큰 벽이에요.
              실글패스는 실제 시험과 같은 <strong className="text-[#334155]">CBT 모의고사</strong>로 시간 감각을 익히고,
              서술형은 <strong className="text-[#334155]">AI가 채점·첨삭</strong>해 어디서 점수를 잃는지 짚어줍니다.
              유형별 연습과 영역별 약점 분석으로 독학으로도 합격까지 갈 수 있어요.
            </p>
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">지금 실력, 몇 점일까?</p>
              <p className="text-white/70 text-sm mb-5">모의고사 2회분은 무료 · 서술형 AI 첨삭도 무료로 체험할 수 있어요.</p>
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
            <Link href="/word-counter" className="underline hover:text-[#1e3a5f]">글자수 세기(원고지 칸수 계산)</Link>
            {" · "}
            <Link href="/kbs-korean" className="underline hover:text-[#1e3a5f]">KBS한국어능력시험 정보</Link>
            {" · "}
            <Link href="/exam-compare" className="underline hover:text-[#1e3a5f]">실용글쓰기·KBS 비교</Link>
          </section>
          <RelatedBlogPosts category="exam-info" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="시험 정보" path="/exam-info" />
      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </div>
  );
}
