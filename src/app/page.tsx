import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FileText, BookOpen, PenLine, CheckCircle, ArrowRight, Sparkles, Users, Star, TrendingUp, Gift } from "lucide-react";
import ReviewMarquee from "@/components/landing/ReviewMarquee";
import SiteFooter from "@/components/layout/SiteFooter";
import ScheduleModal from "@/components/schedule/ScheduleModal";

export const revalidate = 120

const features = [
  {
    icon: BookOpen,
    title: "CBT 문제풀기",
    desc: "한국실용글쓰기 기출문제를 실전과 동일한 CBT 환경에서 풀어보세요. 즉시 채점과 오답 해설을 제공합니다.",
    badge: "무료",
    badgeStyle: "bg-emerald-100 text-emerald-700",
    gradient: "from-blue-500 to-[#1e3a5f]",
  },
  {
    icon: PenLine,
    title: "AI 원고지 채점·첨삭",
    desc: "AI가 원고지 사용법, 맞춤법, 문법, 논리 구성을 분석하고 100점 만점으로 채점·첨삭해드립니다. 가입하면 무료 체험을 제공합니다.",
    badge: "무료 체험",
    badgeStyle: "bg-amber-100 text-amber-700",
    gradient: "from-amber-500 to-orange-600",
  },
];

const benefits = [
  "기출문제 기반 실전 CBT 환경",
  "AI 원고지 즉시 채점·첨삭",
  "항목별 세부 점수 분석",
  "오답 해설 및 교정 제공",
  "모바일·PC 완벽 최적화",
  "학습 기록 대시보드",
];

const stats = [
  { value: "1,200+", label: "학습자", icon: Users },
  { value: "98%", label: "만족도", icon: Star },
  { value: "4.9", label: "평점", icon: TrendingUp },
];

export default async function HomePage() {
  const supabase = await createClient()
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, display_name, content, rating, created_at, exam_score')
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* 헤더 */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#0f1f3d]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">한국실용글쓰기</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10">
              로그인
            </Link>
            <Link href="/signup" className="btn-gold text-sm text-white px-5 py-2 rounded-lg font-semibold">
              무료 시작
            </Link>
          </div>
        </div>
      </header>

      {/* 히어로 */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#080f1e] via-[#0f1f3d] to-[#1e3a5f]" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#1e3a5f] rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#d97706] rounded-full blur-3xl opacity-5" />

        <div className="relative max-w-4xl mx-auto px-4 py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-medium px-4 py-1.5 rounded-full mb-8">
            <Sparkles className="h-3.5 w-3.5 text-[#f59e0b]" />
            한국실용글쓰기 자격증 합격을 위한 최적의 도구
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.1] tracking-tight mb-6">
            CBT 문제풀기 &amp;
            <br />
            <span className="text-gradient-gold">AI 원고지 첨삭</span>
          </h1>

          <p className="text-white/60 text-lg mb-6 leading-relaxed max-w-xl mx-auto">
            기출문제 CBT로 실력을 확인하고,
            AI가 원고지 답안을 즉시 채점·첨삭해드립니다.
          </p>

          <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-10 text-sm">
            <span className="text-emerald-300 font-bold">CBT 완전 무료</span>
            <span className="text-white/30">·</span>
            <span className="text-amber-300 font-bold">AI 첨삭 무료 체험</span>
            <span className="text-white/30">·</span>
            <span className="text-white/80"><b className="text-white">5,500원</b>으로 30일 무제한 <span className="text-white/50">(1회 결제)</span></span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link href="/signup" className="btn-gold inline-flex items-center justify-center gap-2 text-white font-bold px-8 py-4 rounded-xl text-base">
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
          <div className="flex items-center gap-3 text-white">
            <Gift className="h-5 w-5 shrink-0" />
            <div>
              <span className="font-black text-sm sm:text-base">🎉 합격 후기 이벤트</span>
              <span className="text-white/80 text-sm ml-2">시험 합격 후 후기를 남기면 응시료 5,000원 환급!</span>
            </div>
          </div>
          <Link
            href="/signup"
            className="shrink-0 bg-white text-[#d97706] text-sm font-black px-5 py-2 rounded-xl hover:bg-amber-50 transition-colors shadow-md"
          >
            지금 참여하기 →
          </Link>
        </div>
      </section>

      {/* 핵심 기능 */}
      <section className="py-20 px-4">
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

      {/* 혜택 */}
      <section className="py-20 px-4 bg-white">
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
        <section className="py-16 bg-[#f8fafc] overflow-hidden">
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

      {/* CTA */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(217,119,6,0.15)_0%,transparent_60%)]" />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4 tracking-tight">지금 바로 시작해보세요</h2>
          <p className="text-white/60 mb-8 text-base">CBT 문제풀기는 완전 무료 · AI 첨삭도 무료 체험 · 5,500원 1회 결제로 30일 무제한</p>
          <Link href="/signup" className="btn-gold inline-flex items-center gap-2 text-white font-bold px-10 py-4 rounded-xl text-base">
            무료로 시작하기 <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <SiteFooter />
      <ScheduleModal />
    </div>
  );
}
