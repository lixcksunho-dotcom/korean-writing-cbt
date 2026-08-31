import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import { KBS_SCHEDULE, KBS_APPLY_URL, KBS_SCHEDULE_URL } from "@/lib/examSchedule";
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'
import TopicQuiz from '@/components/study/TopicQuiz'

export const metadata: Metadata = {
  title: "KBS한국어능력시험 시험일정·등급·영역 총정리 (2026)",
  description:
    "KBS한국어능력시험 시험일정(접수·시험·발표), 990점 만점 8등급 체계, 100문항 120분 구성, 듣기·어휘·어법·쓰기·창안·읽기·국어문화 7개 영역과 공부 순서를 한눈에. 무료 CBT 모의고사로 지금 실력을 확인하세요.",
  keywords: [
    "KBS한국어능력시험", "KBS한국어능력시험 일정", "KBS한국어능력시험 등급",
    "KBS한국어능력시험 점수", "KBS한국어능력시험 문항수", "KBS한국어능력시험 시험시간",
    "KBS한국어능력시험 독학", "KBS한국어능력시험 기출", "국가공인 한국어능력시험", "KBS한국어 모의고사",
  ],
  alternates: { canonical: "/kbs-korean" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "KBS한국어능력시험 시험일정·등급·영역 총정리",
    description: "990점 8등급, 100문항 120분, 7개 영역 구성과 공부 순서를 한눈에. 무료 CBT 모의고사 제공.",
    url: "/kbs-korean",
    type: "website",
  },
};

const WD = ["일", "월", "화", "수", "목", "금", "토"];
function fmt(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}.${m}.${d}(${wd})`;
}

// KBS CBT는 전용 서비스(kbstest.cloud)로 이전했다. 이 페이지는 검색 유입을 받아
// 그쪽으로 보내는 안내문으로 남는다 — 영역 배분은 공개 시험구조 값을 직접 적는다.
const KBSPASS_URL = "https://kbstest.cloud";
const AREAS = [
  { name: "듣기·말하기", from: 1, to: 15 },
  { name: "어휘", from: 16, to: 30 },
  { name: "어법", from: 31, to: 45 },
  { name: "쓰기", from: 46, to: 50 },
  { name: "창안", from: 51, to: 60 },
  { name: "읽기", from: 61, to: 90 },
  { name: "국어문화", from: 91, to: 100 },
].map((a) => ({
  name: a.name,
  range: `${a.from}~${a.to}번`,
  count: a.to - a.from + 1,
}));

// 주관처가 공개하는 것은 '등급별 능력 수준'이고 절대 점수컷은 공개하지 않는다.
const GRADES = [
  { name: "1급", desc: "전문가 수준의 뛰어난 능력 (언론인·저술가·국어교육자 수준)" },
  { name: "2+급", desc: "일반인으로서 매우 뛰어난 수준" },
  { name: "2-급", desc: "일반인으로서 뛰어난 수준" },
  { name: "3+급", desc: "일반인으로서 보통 수준 이상" },
  { name: "3-급", desc: "일정 수준 이상의 국어 사용 능력" },
  { name: "4+급", desc: "국어 교육을 정상적으로 수료한 수준" },
  { name: "4-급", desc: "고교 교육 수료 수준" },
  { name: "무급", desc: "국어 사용 능력 향상이 필요한 수준" },
];

const FAQ = [
  {
    q: "KBS한국어능력시험은 몇 문항이고 시험 시간은 얼마인가요?",
    a: "객관식 5지선다 100문항이며, 시험 시간은 120분입니다. 앞부분 듣기·말하기 15문항을 25분 동안 방송으로 듣고, 남은 95분 동안 어휘·어법·쓰기·창안·읽기·국어문화 85문항을 풉니다. 읽기 지문이 길어 시간 관리가 당락을 가릅니다.",
  },
  {
    q: "등급은 어떻게 나뉘나요? 몇 점부터 1급인가요?",
    a: "990점 만점에 1급·2+급·2-급·3+급·3-급·4+급·4-급·무급의 8단계입니다. 다만 주관처는 누적 응시 데이터를 바탕으로 등급을 산정하고 절대 점수컷을 공개하지 않습니다. 그래서 '몇 점이면 몇 급'이라고 단정하는 정보는 신뢰하기 어렵고, 실전 모의고사로 백분위 감각을 익히는 편이 정확합니다.",
  },
  {
    q: "어느 영역부터 공부해야 하나요?",
    a: "배점 비중이 큰 어휘(15문항)·어법(15문항)·읽기(30문항)가 전체의 60%입니다. 그중 어법은 한글 맞춤법·표준어 규정·표준 발음법·외래어/로마자 표기법처럼 범위가 정해져 있어 투자 대비 점수가 가장 잘 오릅니다. 어법 → 어휘 → 읽기 순으로 잡고, 창안·국어문화는 기출 유형 위주로 정리하는 방식이 효율적입니다.",
  },
  {
    q: "듣기 영역은 어떻게 대비하나요?",
    a: "설명(그림)·우화·시·강연·공적 대화·사적 대화·협상 등 유형이 반복됩니다. 실글패스의 KBS 모드 모의고사는 듣기 문항에 실제 음성을 제공하고, 채점 후 해설에서 듣기 대본을 함께 보여 줘 무엇을 놓쳤는지 문장 단위로 되짚을 수 있습니다.",
  },
  {
    q: "독학으로 준비할 수 있나요?",
    a: "네. 100문항을 120분 안에 푸는 감각이 핵심이라, 실전과 같은 CBT 환경에서 시간을 재며 푸는 연습이 가장 중요합니다. 회차를 풀면 영역별 정답률이 나와 어디서 점수를 잃는지 바로 보이고, 틀린 문항만 모아 다시 풀 수 있어 학원 없이도 충분히 준비할 수 있습니다.",
  },
];

export default function KbsKoreanPage() {
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
          <a href="https://kbstest.cloud/cbt" className="text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f] transition-colors py-3">
            무료 CBT 모의고사 →
          </a>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
          <h1 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight mb-2">
            KBS한국어능력시험 시험 정보
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            <strong className="text-[#334155]">시험일정·등급 체계·영역 구성·공부 순서</strong>를 한눈에 정리했어요.
            준비를 시작했다면 아래 무료 CBT 모의고사로 지금 실력을 먼저 확인해 보세요.
          </p>

          <div className="mb-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-[#ecfdf5] to-[#f0fdfa] p-5">
            <p className="text-sm text-[#475569] leading-relaxed">
              KBS한국어능력시험은 <b className="text-[#0f766e]">990점 만점</b>, 객관식 5지선다{" "}
              <b className="text-[#0f766e]">100문항 · 120분</b>으로 치르는 국가공인 시험이에요.
              듣기·말하기부터 국어문화까지 <b className="text-[#0f766e]">7개 영역</b>을 보고, 결과는{" "}
              <b className="text-[#0f766e]">1급~무급 8단계</b>로 나옵니다.
            </p>
          </div>

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
                  {KBS_SCHEDULE.map((r) => (
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
            <p className="mt-2 text-xs text-[#64748b]">
              일정은 주관처 사정으로 변경될 수 있어요. 접수·전체 일정은{" "}
              <a href={KBS_APPLY_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1e3a5f]">
                KBS한국어진흥원 공식 페이지
              </a>
              에서 확인하세요.
            </p>
          </section>

          {/* 읽고 끝나지 않게 — 읽은 자리에서 바로 풀어보고 실전으로 잇는다 */}
          <TopicQuiz topic="kbs-korean" />

          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">영역 구성 (100문항 · 120분)</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2.5 text-left font-bold">영역</th>
                    <th className="px-3 py-2.5 text-left font-bold">문항 번호</th>
                    <th className="px-3 py-2.5 text-right font-bold">문항 수</th>
                  </tr>
                </thead>
                <tbody>
                  {AREAS.map((a) => (
                    <tr key={a.name} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2.5 font-bold text-[#0f172a] whitespace-nowrap">{a.name}</td>
                      <td className="px-3 py-2.5 text-[#475569]">{a.range}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[#1e3a5f]">{a.count}문항</td>
                    </tr>
                  ))}
                  <tr className="border-t border-[#e2e8f0] bg-[#f8fafc]">
                    <td className="px-3 py-2.5 font-black text-[#0f172a]">합계</td>
                    <td className="px-3 py-2.5 text-[#475569]">객관식 5지선다 · 120분</td>
                    <td className="px-3 py-2.5 text-right font-black text-[#0f172a]">100문항</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-[#64748b]">
              듣기·말하기 15문항은 앞부분 25분 동안 방송으로 진행되고, 남은 95분에 나머지 85문항을 풉니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">등급 체계 (990점 만점 · 8단계)</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2.5 text-left font-bold">등급</th>
                    <th className="px-3 py-2.5 text-left font-bold">인정되는 능력 수준</th>
                  </tr>
                </thead>
                <tbody>
                  {GRADES.map((g) => (
                    <tr key={g.name} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2.5 font-bold text-[#0f172a] whitespace-nowrap">{g.name}</td>
                      <td className="px-3 py-2.5 text-[#475569]">{g.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-[#64748b]">
              주관처는 누적 응시 데이터를 바탕으로 등급을 산정하며 <b>절대 점수컷을 공개하지 않습니다</b>.
              실글패스가 보여 주는 등급은 학습 참고용 예상 등급이에요.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">어떻게 준비할까요?</h2>
            <p className="text-[#475569] leading-relaxed mb-4">
              KBS한국어능력시험의 최대 난관은 지식이 아니라 <strong className="text-[#334155]">시간</strong>입니다.
              읽기 30문항의 지문이 길어, 앞 영역에서 시간을 흘리면 뒤를 못 풀고 끝나요. 그래서 실전과 같은{" "}
              <strong className="text-[#334155]">CBT 환경에서 120분을 재며 푸는 연습</strong>이 가장 빠른 길입니다.
              KBS한국어 전용 서비스 <strong className="text-[#334155]">KBS패스(kbstest.cloud)</strong>에서 회차를 풀면{" "}
              <strong className="text-[#334155]">영역별 정답률</strong>로 약점을 짚어 주고, 틀린 문항만 모아 다시 풀 수 있습니다.
            </p>
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#064e3b] to-[#0f766e] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">지금 실력, 몇 급일까?</p>
              <p className="text-white/70 text-sm mb-5">모의고사 1회분은 무료 · 가입하면 AI 첨삭도 무료로 체험할 수 있어요.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href={`${KBSPASS_URL}/cbt`} className="btn-gold inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm">
                  무료 CBT 모의고사 풀어보기
                </a>
                <a href={`${KBSPASS_URL}/signup`} className="inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm bg-white/10 text-white border border-white/20 hover:bg-white/15 transition-colors">
                  무료로 시작하기
                </a>
              </div>
            </div>
          </section>

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

          <section className="mt-10 text-sm text-[#64748b]">
            함께 보기:{" "}
            <Link href="/spelling" className="underline hover:text-[#1e3a5f]">자주 틀리는 맞춤법</Link>
            {" · "}
            <Link href="/exam-info" className="underline hover:text-[#1e3a5f]">한국실용글쓰기 시험 정보</Link>
            {" · "}
            <Link href="/exam-compare" className="underline hover:text-[#1e3a5f]">실용글쓰기·KBS 비교</Link>
            {" · "}
            <a href={KBS_SCHEDULE_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1e3a5f]">
              공식 접수 페이지
            </a>
          </section>
          <RelatedBlogPosts category="exam-info" seed="kbs-korean" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="KBS한국어능력시험" path="/kbs-korean" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
