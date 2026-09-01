import Link from "next/link";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { SB_URL, SB_ANON } from "@/lib/supabase/sanitize";
import { FileText, BookOpen, PenLine, CheckCircle, ArrowRight, Sparkles, Star, Gift, RotateCcw, Wallet } from "lucide-react";
import LogoGlyph from "@/components/layout/LogoGlyph";
import ReviewMarquee from "@/components/landing/ReviewMarquee";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import SiteFooter from "@/components/layout/SiteFooter";
import ScheduleModal from "@/components/schedule/ScheduleModal";
import { GradingSampleCompact } from "@/components/manuscript/GradingSample";
import { questionBank } from '@/lib/questionBank'

// ISR 캐시로 빠르게 응답(매 요청 SSR 시 Supabase 왕복으로 7초+ 느려지던 문제 해소).
// 통계가 0으로 굳는 문제는 아래 roundCount/questionCount 폴백(|| 9, || 393)으로 방지.
export const revalidate = 600

const features = [
  {
    icon: BookOpen,
    title: "CBT 문제풀기",
    desc: "한국실용글쓰기 기출 유형 문항을 실전과 동일한 CBT 환경에서 풀어보세요. 즉시 채점과 오답 해설을 제공합니다.",
    badge: "무료",
    badgeStyle: "bg-emerald-100 text-emerald-700",
    gradient: "from-blue-500 to-[#1e3a5f]",
  },
  {
    icon: PenLine,
    title: "AI 원고지 채점·첨삭",
    desc: "AI가 원고지 사용법, 맞춤법, 문법, 논리 구성을 분석하고 100점 만점으로 채점·첨삭해드립니다. 가입만 하면 결제 없이 3회 체험할 수 있어요.",
    badge: "3회 무료 체험",
    badgeStyle: "bg-amber-100 text-amber-700",
    gradient: "from-amber-500 to-orange-600",
  },
];

// 진입 마찰을 줄이는 3단계 흐름(전환↑) — "복잡하지 않고 바로 시작된다"는 인식을 준다.
const steps = [
  { n: "1", title: "무료 가입", desc: "이메일로 30초면 가입 완료. 카드 등록도, 자동결제도 없어요." },
  { n: "2", title: "CBT 무료 풀이", desc: "기출 기반 실전 모의고사를 바로 풀고, 즉시 채점·해설을 확인하세요." },
  { n: "3", title: "AI 첨삭 체험", desc: "서술형·원고지 답안을 AI가 항목별로 채점·첨삭. 3회 무료로 먼저 써보세요." },
];

const benefits = [
  "기출 유형 기반 실전 CBT 환경",
  "AI 원고지 즉시 채점·첨삭",
  "항목별 세부 점수 분석",
  "오답 해설 및 교정 제공",
  "모바일·PC 완벽 최적화",
  "학습 기록 대시보드",
];

// 구매 망설임을 줄이는 FAQ(전환↑) + FAQPage 구조화데이터(검색 리치결과)로 함께 사용.
const FAQS = [
  {
    q: "한국실용글쓰기, 독학으로 합격할 수 있나요?",
    a: "네. 유형별 집중 연습으로 약점을 잡고, 서술형은 AI 채점·첨삭으로 혼자서도 피드백을 받고, 실전 CBT 모의고사로 시험 감각까지 익히면 학원 없이도 충분히 합격할 수 있어요.",
  },
  {
    q: "모의고사는 정말 무료인가요?",
    a: "네. CBT 실전 모의고사 풀이는 무료이고, 서술형 AI 첨삭도 가입하면 무료로 체험할 수 있어요. 먼저 써보고 결정하세요.",
  },
  {
    q: "결제는 어떻게 되나요? 자동결제인가요?",
    a: "5,500원 1회 결제로 30일 무제한이에요. 매달 빠져나가는 정기 구독(자동결제)이 아니라, 필요할 때 한 번만 결제하는 방식입니다.",
  },
  {
    q: "서술형은 혼자 채점하기 어려운데요?",
    a: "AI가 조건 충족 여부, 맞춤법·문장, 논리 구성을 분석해 항목별 점수와 첨삭을 바로 제공해요. 채점해줄 사람이 없어도 고쳐 쓰며 실력을 올릴 수 있어요.",
  },
  {
    q: "실제 시험과 똑같이 연습할 수 있나요?",
    a: "실제 CBT 환경 그대로 원고지 입력, 서술형 작성, 시간 제한까지 시험장처럼 연습할 수 있어요. 종이로만 공부하다 화면이 낯설어 실수하는 걸 막아줘요.",
  },
  {
    q: "환불이 되나요?",
    a: "환불 정책에 따라 처리돼요. 자세한 내용은 하단의 환불 정책 페이지에서 확인하실 수 있어요.",
  },
];

export default async function HomePage() {
  // 쿠키 없는 anon 클라이언트 — 쿠키 의존이 없어야 ISR 정적 캐시가 적용돼 홈이 빠르다.
  // (공개 데이터만 조회: 후기/문항 수). 쿠키 기반 createClient는 매 요청 동적 렌더라 7초+ 걸림.
  const supabase = createPublicClient(
    SB_URL,
    SB_ANON,
    { auth: { persistSession: false } }
  )
  const [{ data: reviews }, { data: qrows }] = await Promise.all([
    supabase
      .from('reviews')
      .select('id, display_name, content, rating, created_at, exam_score, verified')
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(20),
    // 이 랜딩은 실용글쓰기(실글패스) 소개 — KBS 문항이 지표에 섞이지 않게 program을 좁힌다.
    questionBank().from('questions').select('round, type').eq('program', 'silyong').lt('year', 9000),
  ])

  // 실제 데이터 기반 지표. 단 쿼리가 일시 실패해 0이 되면 '0회분/0문항'이 노출되므로
  // 실제 보유 수치(폴백)로 보정해 깨진 0 표시를 막는다.
  const roundCount = new Set((qrows ?? []).map(r => r.round)).size || 9
  const questionCount = (qrows ?? []).length || 351
  const reviewCount = reviews?.length ?? 0
  const avgRating = reviewCount ? (reviews!.reduce((s, r) => s + (r.rating ?? 0), 0) / reviewCount) : 0

  const stats = [
    { value: `${roundCount}회분`, label: "실전 모의고사", icon: BookOpen },
    { value: `${questionCount}`, label: "기출 유형 문항", icon: FileText },
    // 실사용 후기가 충분할 때만 평점 노출, 아니면 제품 사실로 대체
    reviewCount >= 3
      ? { value: `${avgRating.toFixed(1)}★`, label: `실사용 후기 ${reviewCount}개`, icon: Star }
      : { value: "무제한", label: "서술형 AI 첨삭", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* 헤더 */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#0f1f3d]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center">
              <LogoGlyph className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">실글패스</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors px-4 py-3 rounded-lg hover:bg-white/10">
              로그인
            </Link>
            <Link href="/signup" className="btn-gold text-sm px-5 py-3 rounded-lg font-semibold">
              무료 시작
            </Link>
          </div>
        </div>
      </header>

      {/* 학습자료·블로그 면에는 다 있는데 정작 첫 화면에만 main이 없었다.
          낭독기가 '본문'으로 건너뛸 자리가 사라진다. */}
      <main id="main">

      {/* 히어로 */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#080f1e] via-[#0f1f3d] to-[#1e3a5f]" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#1e3a5f] rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#d97706] rounded-full blur-3xl opacity-5" />

        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-medium px-4 py-1.5 rounded-full mb-8">
            <Sparkles className="h-3.5 w-3.5 text-[#f59e0b]" />
            한국실용글쓰기 자격증 합격을 위한 최적의 도구
          </div>

          {/* 첫 문장에서 정체를 밝힌다(자매 서비스와 같은 처방) — 무슨 시험의 무엇인지 h1에 그대로 */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.12] tracking-tight mb-6">
            한국실용글쓰기
            <br />
            실전 CBT &amp; <span className="text-gradient-gold">AI 첨삭</span>
          </h1>

          <p className="text-white/60 text-lg mb-6 leading-relaxed max-w-xl mx-auto">
            실글패스는 국가공인 한국실용글쓰기검정을 실전 화면·120분 제한 CBT로 풀고,
            서술형·원고지 답안을 AI가 즉시 채점·첨삭해 주는 온라인 모의고사 서비스입니다.
          </p>

          <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-10 text-sm">
            <span className="text-emerald-300 font-bold">CBT 완전 무료</span>
            <span className="text-white/30">·</span>
            <span className="text-amber-300 font-bold">AI 첨삭 무료 체험</span>
            <span className="text-white/30">·</span>
            <span className="text-white/80"><b className="text-white">5,500원</b>으로 30일 무제한 <span className="text-white/50">(1회 결제)</span></span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link href="/signup" className="btn-gold inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-xl text-base">
              무료로 시작하기 <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all text-base">
              로그인
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            {stats.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 text-white/80">
                <Icon className="h-4 w-4 text-[#f59e0b]" />
                <span className="font-bold text-white">{value}</span>
                <span className="text-sm text-white/60">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative h-16">
          <svg viewBox="0 0 1440 64" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0,32 C240,64 480,0 720,32 C960,64 1200,0 1440,32 L1440,64 L0,64 Z" fill="#f8fafc" />
          </svg>
        </div>
      </section>

      {/* 이벤트 배너 */}
      <section className="py-5 px-4 bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#d97706]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* 금색 위 흰 글자는 명암비 2.15라 읽히지 않는다 — 금색을 살리고 글자를 진하게 둔다 */}
          <div className="flex items-center gap-3 text-[#0f172a]">
            <Gift className="h-5 w-5 shrink-0" />
            <div>
              <span className="font-black text-sm sm:text-base">🎉 합격 후기 이벤트</span>
              <span className="text-[#451a03] text-sm ml-2">시험 합격 후 후기를 남기면 응시료 5,000원 환급!</span>
            </div>
          </div>
          <Link
            href="/signup"
            className="shrink-0 bg-white text-[#b45309] text-sm font-black px-5 py-3 rounded-xl hover:bg-amber-50 transition-colors shadow-md"
          >
            지금 참여하기 →
          </Link>
        </div>
      </section>

      {/* 핵심 기능 */}
      <section className="defer-render py-20 px-4" style={{ containIntrinsicSize: 'auto 920px' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-[#0f172a] mb-3 tracking-tight">핵심 기능</h2>
            <p className="text-[#64748b] text-base">자격증 합격에 필요한 모든 것</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, desc, badge, badgeStyle, gradient }) => (
              <div key={title} className="card-hover bg-white rounded-2xl p-7 border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.06)]">
                <div className={`inline-flex p-3.5 rounded-2xl bg-gradient-to-br ${gradient} mb-5 shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-[#0f172a] text-lg">{title}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${badgeStyle}`}>{badge}</span>
                </div>
                <p className="text-[#64748b] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 서술형 차별화 — 합격의 70%가 서술형(700점), 그걸 AI가 채점·첨삭 (무료 CBT엔 없는 강점) */}
      <section className="defer-render py-16 px-4 bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f]" style={{ containIntrinsicSize: 'auto 760px' }}>
        <div className="max-w-3xl mx-auto text-center text-white">
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <PenLine className="h-3.5 w-3.5" /> 실글패스만의 강점
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-3">합격은 서술형에서 갈립니다</h2>
          <p className="text-white/70 leading-relaxed mb-8 max-w-xl mx-auto">
            한국실용글쓰기는 1,000점 중 <b className="text-white">서술형이 700점</b>. 객관식은 어디서나 풀 수 있지만,
            <b className="text-white"> 서술형·원고지 답안을 채점·첨삭</b>해 주는 곳은 드뭅니다.
          </p>
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex-1 max-w-[9rem] rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-2xl font-black text-white/50">300<span className="text-sm">점</span></div>
              <div className="text-xs text-white/50 mt-0.5">객관식</div>
            </div>
            <div className="flex-1 max-w-[9rem] rounded-xl bg-amber-400/15 border border-amber-300/40 p-4">
              <div className="text-2xl font-black text-amber-300">700<span className="text-sm">점</span></div>
              <div className="text-xs text-amber-200/80 mt-0.5">서술형 · AI 첨삭</div>
            </div>
          </div>
          <p className="text-white/70 leading-relaxed mb-6 max-w-xl mx-auto">
            실글패스는 AI가 <b className="text-white">원고지 사용법·답안 기준 부합·맞춤법</b>을 항목별로 채점하고
            틀린 곳을 하나씩 고쳐 줘요. 채점해 줄 사람이 없어도 혼자서 고쳐 쓰며 실력을 올릴 수 있어요.
          </p>

          {/* 말로만 설명하지 않고 결과가 어떻게 생겼는지 그대로 보여 준다 */}
          <div className="mb-7 max-w-md mx-auto">
            <GradingSampleCompact />
          </div>

          <Link href="/signup" className="btn-gold inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl text-sm">
            서술형 AI 첨삭 무료로 체험 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* 이용 3단계 */}
      <section className="defer-render pb-4 px-4" style={{ containIntrinsicSize: 'auto 520px' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-[#0f172a] mb-3 tracking-tight">3단계로 바로 시작</h2>
            <p className="text-[#64748b] text-base">복잡한 설정 없이, 가입하고 바로 풀어보세요</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {steps.map(({ n, title, desc }, i) => (
              <div key={n} className="relative bg-white rounded-2xl p-6 border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.06)]">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#0f1f3d] text-white font-black text-lg mb-4">
                  {n}
                </div>
                <h3 className="font-bold text-[#0f172a] text-lg mb-1.5">{title}</h3>
                <p className="text-[#64748b] text-sm leading-relaxed">{desc}</p>
                {i < steps.length - 1 && (
                  <ArrowRight aria-hidden className="hidden sm:block absolute top-1/2 -right-3.5 h-5 w-5 text-[#cbd5e1] -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 무료 / 유료 비교 */}
      <section className="defer-render py-16 px-4 bg-white" style={{ containIntrinsicSize: 'auto 900px' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-[#0f172a] mb-3 tracking-tight">무료로 시작하고, 필요할 때 무제한</h2>
            <p className="text-[#64748b] text-base">가입은 무료예요. AI 첨삭은 먼저 무료로 체험하고 결정하세요.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 items-start">
            {/* 무료 */}
            <div className="bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] p-7">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-black text-[#0f172a]">무료</h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">가입만 하면</span>
              </div>
              <p className="text-sm text-[#64748b] mb-5">회원이면 누구나, 결제 없이</p>
              <ul className="space-y-2.5">
                {[
                  // '전 회차'라고 적혀 있었는데 무료는 실글 2회차·KBS 1회차뿐이다(programs.ts의 freeRounds).
                  // 결제 여부를 여기서 판단하는 표라, 여기가 틀리면 산 사람이 기대한 것과 다른 걸 받는다.
                  'CBT 실전 모의고사 무료 2회차',
                  '객관식 정답·해설 전체 공개',
                  '서술형 모범답안 열람',
                  '맞춤법·외래어·문장호응 유형별 연습',
                  '서술형·원고지 AI 첨삭 3회 무료 체험',
                ].map(t => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-[#334155]">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />{t}
                  </li>
                ))}
              </ul>
            </div>

            {/* 유료 */}
            <div className="relative bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] rounded-2xl p-7 text-white shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#d97706] rounded-full blur-3xl opacity-20 -translate-y-1/3 translate-x-1/3" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-black">이용권</h3>
                  <span className="text-xs font-bold text-[#0f1f3d] bg-amber-400 px-2.5 py-0.5 rounded-full">5,500원 · 30일</span>
                </div>
                <p className="text-sm text-white/60 mb-5">1회 결제 · 자동결제 없음 — 합격까지 무제한</p>
                <ul className="space-y-2.5 mb-6">
                  {[
                    // 잠긴 회차 해제가 유료의 가장 큰 실익인데 목록에서 빠져 있었다.
                    '잠긴 모의고사 전 회차 무제한 풀이',
                    'AI 예상 점수·합격 등급 판정',
                    '서술형 9문항 AI 첨삭·점수 무제한',
                    '원고지 AI 채점·첨삭 무제한',
                    '영역별 약점 분석 · 저장하고 이어풀기',
                  ].map(t => (
                    <li key={t} className="flex items-start gap-2.5 text-sm text-white/90">
                      <Sparkles className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />{t}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="btn-gold inline-flex items-center justify-center gap-2 w-full font-bold py-3 rounded-xl text-sm">
                  무료로 체험하고 결정하기 <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 가치 앵커링 — 응시료 대비 프레이밍(전환↑). 특정 학원가를 지어내지 않고 사실만 사용. */}
      <section className="defer-render py-16 px-4 bg-[#f8fafc]" style={{ containIntrinsicSize: 'auto 620px' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-[#0f172a] mb-3 tracking-tight">떨어지면 응시료가 더 듭니다</h2>
            <p className="text-[#64748b] text-base">한 번에 붙는 게 가장 아끼는 길이에요</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 text-center">
              <div className="inline-flex p-2.5 rounded-xl bg-[#f1f5f9] mb-3"><Wallet className="h-5 w-5 text-[#475569]" /></div>
              <p className="text-sm font-bold text-[#334155] mb-1">시험 응시료</p>
              <p className="text-2xl font-black text-[#0f172a]">약 2~3만 원</p>
              <p className="text-xs text-[#64748b] mt-1">1회 응시 기준</p>
            </div>
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 text-center">
              <div className="inline-flex p-2.5 rounded-xl bg-red-50 mb-3"><RotateCcw className="h-5 w-5 text-red-700" /></div>
              <p className="text-sm font-bold text-[#334155] mb-1">불합격 후 재응시</p>
              <p className="text-2xl font-black text-red-600">+2~3만 원</p>
              <p className="text-xs text-[#64748b] mt-1">떨어질 때마다 반복</p>
            </div>
            <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 text-center shadow-[0_4px_20px_rgba(217,119,6,0.10)]">
              <div className="inline-flex p-2.5 rounded-xl bg-amber-100 mb-3"><Sparkles className="h-5 w-5 text-amber-700" /></div>
              <p className="text-sm font-bold text-[#334155] mb-1">실글패스 이용권</p>
              <p className="text-2xl font-black text-[#0f172a]">5,500원</p>
              <p className="text-xs text-[#b45309] font-semibold mt-1">합격 전까지 무제한 연습</p>
            </div>
          </div>
          <p className="text-center text-sm text-[#64748b] mt-6">
            응시료 <b className="text-[#334155]">한 번</b> 값이면, 실글패스로 <b className="text-[#334155]">30일 무제한</b> 실전 연습이 됩니다.
          </p>
        </div>
      </section>

      {/* 혜택 */}
      <section className="defer-render py-20 px-4 bg-white" style={{ containIntrinsicSize: 'auto 700px' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-[#0f172a] mb-3 tracking-tight">왜 선택해야 할까요?</h2>
          <p className="text-[#64748b] mb-10">합격에 필요한 모든 기능을 한 곳에서</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-2.5 bg-[#f8fafc] rounded-xl px-4 py-3.5 text-left border border-[#e2e8f0] hover:border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/5 transition-colors">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-sm font-medium text-[#334155]">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 실 사용자 후기 */}
      {(reviews?.length ?? 0) > 0 && (
        <section className="defer-render py-16 bg-[#f8fafc] overflow-hidden" style={{ containIntrinsicSize: 'auto 820px' }}>
          <div className="max-w-4xl mx-auto px-4 mb-8 text-center">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <Star className="h-3.5 w-3.5 fill-current" />
              실 사용자 후기
            </div>
            <h2 className="text-3xl font-black text-[#0f172a] tracking-tight">
              합격자들의 이야기
            </h2>
          </div>
          <ReviewMarquee reviews={reviews!} />
        </section>
      )}

      {/* 두 번째 시험(KBS) 안내 — 검색으로 들어온 KBS 준비생이 바로 갈 곳을 준다 */}
      <section className="defer-render py-14 px-4 bg-white" style={{ containIntrinsicSize: 'auto 300px' }}>
        <div className="max-w-3xl mx-auto rounded-2xl border border-emerald-200 bg-gradient-to-br from-[#ecfdf5] to-[#f0fdfa] p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-white/70 border border-emerald-200 px-2.5 py-1 rounded-full mb-2">
              NEW
            </div>
            <h2 className="text-xl font-black text-[#0f172a] mb-1.5">KBS한국어능력시험은 전용 서비스에서</h2>
            <p className="text-sm text-[#475569] leading-relaxed">
              국가공인 KBS한국어능력시험(990점·100문항·120분)은 전용 서비스 <b>KBS패스</b>에서 준비하세요.
              듣기 음성이 들어간 실전 CBT와 7개 영역별 약점 분석을 제공합니다.
            </p>
          </div>
          <a
            href="https://kbstest.cloud"
            className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-[#0f766e] hover:bg-[#115e59] text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            KBS패스 바로가기 <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* 자주 묻는 질문 */}
      <section className="defer-render py-20 px-4 bg-[#f8fafc]" style={{ containIntrinsicSize: 'auto 900px' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-[#0f172a] mb-3 tracking-tight">자주 묻는 질문</h2>
            <p className="text-[#64748b]">궁금한 점을 빠르게 확인하세요</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group bg-white rounded-xl border border-[#e2e8f0] px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-[#0f172a] text-base">
                  <span>{f.q}</span>
                  <span className="ml-3 text-[#64748b] text-2xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[#475569] text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ 구조화데이터(검색 리치결과) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      {/* CTA */}
      <section className="defer-render py-20 px-4 relative overflow-hidden" style={{ containIntrinsicSize: 'auto 420px' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(217,119,6,0.15)_0%,transparent_60%)]" />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4 tracking-tight">지금 바로 시작해보세요</h2>
          <p className="text-white/60 mb-8 text-base">CBT 문제풀기는 완전 무료 · AI 첨삭도 무료 체험 · 5,500원 1회 결제로 30일 무제한</p>
          <Link href="/signup" className="btn-gold inline-flex items-center gap-2 font-bold px-10 py-4 rounded-xl text-base">
            무료로 시작하기 <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      </main>

      <SiteFooter />
      <ScheduleModal />
      <StickyMobileCTA />
    </div>
  );
}
