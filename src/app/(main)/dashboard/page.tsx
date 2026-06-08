import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, PenLine, Trophy, Clock, ChevronRight, ArrowUpRight, Sparkles, CheckCircle2, Gift, TrendingUp, Lock, Gauge } from "lucide-react";
import ReviewWriteModal from "@/components/review/ReviewWriteModal";
import { getActiveSubscription, daysUntilExpiry } from "@/lib/subscription";
import { FREE_AI_TRIAL } from "@/lib/aiTrial";
import { tierFor } from "@/lib/grade";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "안녕히 주무셨나요";
  if (h < 12) return "좋은 아침이에요";
  if (h < 17) return "좋은 오후예요";
  if (h < 21) return "좋은 저녁이에요";
  return "늦은 시간이네요";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = user.user_metadata?.name || user.email?.split("@")[0] || "회원";

  const [{ data: sessions }, { data: manuscripts }, sub] = await Promise.all([
    supabase
      .from("quiz_sessions")
      .select("id, year, round, score, total, started_at, completed_at")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false }),
    supabase
      .from("manuscript_submissions")
      .select("created_at")
      .eq("user_id", user.id),
    getActiveSubscription(user.id),
  ]);
  const manuscriptCount = manuscripts?.length ?? 0;

  // 무료 AI 첨삭 체험 잔여 — 이미 받아온 user의 app_metadata에서 바로 계산(추가 getUser 왕복 제거)
  const trialUsed = Number(user.app_metadata?.ai_trial_used ?? 0);
  const aiTrial = { remaining: sub ? 0 : Math.max(0, FREE_AI_TRIAL - trialUsed) };

  const completedSessions = sessions ?? [];
  const totalAnswered = completedSessions.reduce((sum, s) => sum + (s.total ?? 0), 0);
  const totalCorrect = completedSessions.reduce((sum, s) => sum + (s.score ?? 0), 0);
  const correctRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const totalSeconds = completedSessions.reduce((sum, s) => {
    if (s.completed_at && s.started_at)
      return sum + Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 1000);
    return sum;
  }, 0);
  const studyHours = totalSeconds >= 3600
    ? `${(totalSeconds / 3600).toFixed(1)}h`
    : totalSeconds >= 60 ? `${Math.floor(totalSeconds / 60)}m`
    : totalSeconds > 0 ? `${totalSeconds}s` : "0h";

  // 연속 학습일(스트릭) — 시험·원고지 활동이 있었던 날 기준
  const activeDays = new Set<string>();
  for (const s of completedSessions) if (s.completed_at) activeDays.add(new Date(s.completed_at).toISOString().slice(0, 10));
  for (const m of manuscripts ?? []) if (m.created_at) activeDays.add(new Date(m.created_at as string).toISOString().slice(0, 10));
  let streak = 0;
  {
    const d = new Date();
    const key = (dt: Date) => dt.toISOString().slice(0, 10);
    if (!activeDays.has(key(d))) d.setDate(d.getDate() - 1); // 오늘 아직 안 했으면 어제부터 카운트
    while (activeDays.has(key(d))) { streak++; d.setDate(d.getDate() - 1); }
  }

  // 이용권 만료 임박(7일 이내) 여부
  const expiryDays = sub ? daysUntilExpiry(sub.expires_at) : null;
  const expiringSoon = expiryDays !== null && expiryDays <= 7;

  // ── AI 예상 점수(유료 핵심) ──
  // 객관식 정답률(→300점) + 서술형 AI 채점 평균(→700점)으로 1000점 환산 예상 점수 추정.
  let essayRate: number | null = null;
  if (sub && completedSessions.length > 0) {
    // 한 번의 조인 쿼리로 ai_score + 문항 배점을 함께 가져온다(쿼리 2→1).
    const { data: ea } = await supabase
      .from("quiz_answers")
      .select("ai_score, questions(points)")
      .in("session_id", completedSessions.map(s => s.id))
      .not("ai_score", "is", null);
    if (ea && ea.length) {
      const sumAi = ea.reduce((s, a) => s + (Number(a.ai_score) || 0), 0);
      const sumP = ea.reduce((s, a) => s + (Number((a.questions as { points?: number } | null)?.points) || 0), 0);
      essayRate = sumP > 0 ? sumAi / sumP : null;
    }
  }
  const objRate = totalAnswered > 0 ? totalCorrect / totalAnswered : null;
  // 서술형 미채점 시 객관식률로 잠정 추정
  const predicted = objRate == null ? null : Math.round(objRate * 300 + (essayRate ?? objRate) * 700);
  const predictedTier = predicted != null ? tierFor(predicted) : null;
  const objPart = objRate != null ? Math.round(objRate * 300) : null;
  const essayPart = essayRate != null ? Math.round(essayRate * 700) : null;

  const stats = [
    {
      label: "풀이한 문제", value: `${totalAnswered}`, icon: BookOpen,
      from: "from-blue-500", to: "to-[#1e3a5f]", shadow: "shadow-blue-500/20",
    },
    {
      label: "정답률", value: `${correctRate}%`, icon: Trophy,
      from: "from-emerald-400", to: "to-emerald-600", shadow: "shadow-emerald-500/20",
    },
    {
      label: "원고지 제출", value: `${manuscriptCount ?? 0}`, icon: PenLine,
      from: "from-amber-400", to: "to-amber-600", shadow: "shadow-amber-500/20",
    },
    {
      label: "학습 시간", value: studyHours, icon: Clock,
      from: "from-purple-400", to: "to-purple-600", shadow: "shadow-purple-500/20",
    },
  ];

  return (
    <div className="animate-fade-up">
      {/* 웰컴 배너 */}
      <div className="relative overflow-hidden rounded-2xl mb-8 bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-7 shadow-[0_8px_32px_rgba(15,31,61,0.2)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d97706] rounded-full blur-3xl opacity-10 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-[#3d6aa0] rounded-full blur-3xl opacity-20 translate-y-1/2" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-white/50 text-sm mb-1">{getGreeting()}, 반갑습니다</p>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {displayName}님 <span className="text-gradient-gold">오늘도 파이팅!</span>
            </h1>
            <p className="text-white/50 mt-2 text-sm">실용글쓰기 합격을 향해 꾸준히 나아가고 있어요.</p>
            {streak > 0 && (
              <span className="inline-flex items-center gap-1.5 mt-3 bg-white/10 border border-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                🔥 {streak}일 연속 학습 중
              </span>
            )}
          </div>
          <div className="shrink-0 pt-1">
            <ReviewWriteModal defaultName={displayName} />
          </div>
        </div>
      </div>

      {/* 이용권 만료 임박 — 재구매 유도 */}
      {expiringSoon && (
        <Link href="/subscribe" className="group flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-8 hover:shadow-[0_8px_24px_rgba(217,119,6,0.15)] transition-all">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-[#d97706] flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-900 text-sm">
              이용권이 {expiryDays === 0 ? '오늘' : `${expiryDays}일 뒤`} 만료돼요
            </p>
            <p className="text-xs text-amber-700">지금 연장하면 AI 첨삭을 끊김 없이 계속 받을 수 있어요.</p>
          </div>
          <span className="shrink-0 btn-gold text-xs font-bold text-white px-4 py-2 rounded-xl">연장하기</span>
        </Link>
      )}

      {/* 온보딩/전환 유도 — 비구독자 + 무료 체험 잔여 시 */}
      {!sub && aiTrial.remaining > 0 && (
        completedSessions.length === 0 ? (
          // 신규 유저: 첫 시험 → 무료 첨삭 2단계 온보딩
          <div className="relative overflow-hidden rounded-2xl mb-8 p-6 border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-300 rounded-full blur-3xl opacity-20 -translate-y-1/3 translate-x-1/3" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-white bg-amber-500 px-2 py-0.5 rounded-full">START</span>
                <h2 className="text-base font-black text-amber-900">2분이면 끝나는 첫걸음</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2.5 bg-white/70 rounded-xl px-3.5 py-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                  <span className="text-sm font-semibold text-amber-900">모의고사 한 문제 풀어보기</span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/70 rounded-xl px-3.5 py-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                  <span className="text-sm font-semibold text-amber-900">내 답안 <b>무료 AI 첨삭</b> 받기</span>
                </div>
              </div>
              <Link href="/cbt" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#d97706] text-white text-sm font-black hover:opacity-90 transition-opacity">
                첫 모의고사 시작하기 <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          // 시험 경험 있는 유저: 무료 AI 첨삭으로 유도
          <Link
            href="/practice/essay"
            className="group block relative overflow-hidden rounded-2xl mb-8 p-5 sm:p-6 border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 hover:shadow-[0_8px_24px_rgba(217,119,6,0.15)] transition-all"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-300 rounded-full blur-3xl opacity-20 -translate-y-1/3 translate-x-1/3" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-[#d97706] flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-base font-black text-amber-900">서술형 AI 첨삭, 무료 {aiTrial.remaining}회 남음</h2>
                  <span className="text-[10px] font-bold text-white bg-amber-500 px-2 py-0.5 rounded-full">FREE</span>
                </div>
                <p className="text-sm text-amber-800/80">내가 쓴 답안을 AI가 모범답안과 비교해 <b>점수·첨삭</b>으로 분석해 드려요. 지금 바로 무료로 받아보세요.</p>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-600 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, from, to, shadow }) => (
          <div
            key={label}
            className={`bg-white rounded-2xl p-5 border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] hover:shadow-[0_8px_24px_rgba(15,31,61,0.1)] transition-all`}
          >
            <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${from} ${to} mb-4 shadow-lg ${shadow}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="text-2xl font-black text-[#0f172a] tracking-tight">{value}</div>
            <div className="text-xs text-[#94a3b8] mt-0.5 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* AI 예상 점수 (유료 핵심) */}
      {completedSessions.length > 0 && (
        sub ? (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-5 sm:p-6 mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="h-5 w-5 text-[#1e3a5f]" />
              <h2 className="text-base font-bold text-[#0f172a]">AI 예상 점수</h2>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">AI 추정</span>
            </div>
            <p className="text-xs text-[#94a3b8] mb-4">객관식 정답률과 서술형 AI 채점 평균을 1000점으로 환산한 추정치예요.</p>

            <div className="flex items-end gap-3 mb-4">
              <span className="text-4xl font-black text-[#0f172a] tracking-tight">{predicted}<span className="text-lg text-[#94a3b8]">점</span></span>
              {predictedTier && (
                <span className={`mb-1.5 inline-flex items-center px-3 py-1 rounded-full text-sm font-black ${
                  predictedTier.color === 'emerald' ? 'bg-emerald-100 text-emerald-700'
                  : predictedTier.color === 'blue' ? 'bg-blue-100 text-blue-700'
                  : predictedTier.color === 'amber' ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600'}`}>
                  {predictedTier.name === '미달' ? '등급 미달' : `${predictedTier.name} 예상`}
                </span>
              )}
            </div>

            {/* 등급 게이지 */}
            <ScoreGauge predicted={predicted ?? 0} />

            <div className="flex items-center gap-4 mt-4 text-xs">
              <span className="text-[#64748b]">객관식 <b className="text-[#0f172a]">{objPart}</b>/300</span>
              <span className="text-[#64748b]">서술형 <b className="text-[#0f172a]">{essayPart ?? '미채점'}</b>/700</span>
            </div>
            {essayPart == null && (
              <Link href="/cbt" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline">
                서술형 AI 채점을 받으면 예상 점수가 더 정확해져요 <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <Link href="/subscribe" className="group block relative overflow-hidden rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-5 sm:p-6 mb-8 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="h-5 w-5 text-[#1e3a5f]" />
              <h2 className="text-base font-bold text-[#0f172a]">AI 예상 점수</h2>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">구독 전용</span>
            </div>
            <p className="text-xs text-[#94a3b8] mb-4">서술형까지 AI가 채점해, 지금 실력이면 <b className="text-[#1e3a5f]">실제 시험에서 몇 점·몇 등급</b>일지 알려줘요.</p>
            <div className="relative">
              <div className="blur-[5px] select-none pointer-events-none" aria-hidden>
                <div className="text-4xl font-black text-[#0f172a] mb-3">7●● <span className="text-lg text-[#94a3b8]">점 · 준2급 예상</span></div>
                <ScoreGauge predicted={735} />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-100"><Lock className="h-4 w-4 text-amber-600" /></span>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-[#1e3a5f] text-xs font-black">구독하고 예상 점수 확인 <ChevronRight className="h-3.5 w-3.5" /></span>
              </div>
            </div>
          </Link>
        )
      )}

      {/* 학습 리포트 진입 (기록 있을 때) */}
      {completedSessions.length > 0 && (
        <Link href="/insights" className="group flex items-center gap-3 bg-white rounded-2xl p-4 mb-8 border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] hover:border-[#1e3a5f]/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5488] flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#0f172a] text-sm">학습 리포트 보기</p>
            <p className="text-xs text-[#94a3b8]">성적 추이 · 영역별 약점 · 오답노트</p>
          </div>
          <ChevronRight className="h-5 w-5 text-[#94a3b8] group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

      {/* 바로가기 카드 */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Link href="/cbt" className="group card-hover bg-white rounded-2xl p-6 border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] block">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-[#1e3a5f] p-3.5 rounded-2xl shadow-lg shadow-blue-500/20 group-hover:shadow-xl group-hover:shadow-blue-500/30 transition-all">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-[#0f172a]">CBT 문제풀기</h2>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#94a3b8] group-hover:text-[#1e3a5f] transition-colors" />
              </div>
              <p className="text-sm text-[#64748b]">기출문제로 실력을 테스트해보세요</p>
              <span className="inline-block mt-2 text-xs bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">무료</span>
            </div>
          </div>
        </Link>

        <Link href="/manuscript" className="group card-hover bg-white rounded-2xl p-6 border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] block">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-3.5 rounded-2xl shadow-lg shadow-amber-500/20 group-hover:shadow-xl group-hover:shadow-amber-500/30 transition-all">
              <PenLine className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-[#0f172a]">원고지 AI 채점</h2>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#94a3b8] group-hover:text-amber-500 transition-colors" />
              </div>
              <p className="text-sm text-[#64748b]">AI가 맞춤법·문법·구성을 분석해드려요</p>
              <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-semibold">AI 탑재</span>
            </div>
          </div>
        </Link>
      </div>

      {/* 구독 상태 */}
      {sub ? (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-emerald-900 text-sm">AI 채점 구독 중</p>
              <p className="text-emerald-700 text-xs">
                {new Date(sub.expires_at).toLocaleDateString('ko-KR')} 만료 · {daysUntilExpiry(sub.expires_at)}일 남음
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Link href="/subscribe/history" className="text-xs font-semibold text-emerald-700/80 hover:text-emerald-800 hover:underline">
              결제 내역
            </Link>
            <Link href="/manuscript" className="text-xs font-bold text-emerald-700 bg-white border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors">
              채점하기 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">AI 원고지 채점 이용권</p>
              <p className="text-amber-700 text-xs">5,500원 1회 결제로 30일 무제한</p>
            </div>
          </div>
          <Link href="/subscribe" className="shrink-0 btn-gold text-xs font-bold text-white px-4 py-2 rounded-xl">
            구독하기
          </Link>
        </div>
      )}

      {/* 최근 CBT 기록 */}
      {completedSessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
            <h2 className="font-bold text-[#0f172a]">최근 CBT 기록</h2>
            <Link href="/cbt" className="text-xs text-[#1e3a5f] font-medium hover:underline flex items-center gap-0.5">
              전체 보기 <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[#f8fafc]">
            {completedSessions.slice(0, 5).map((s) => {
              const pct = s.total ? Math.round(((s.score ?? 0) / s.total) * 100) : 0;
              const pass = pct >= 80;
              return (
                <Link
                  key={s.id}
                  href={`/cbt/${s.year}-${s.round}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[#f8fafc] transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#f1f5f9] flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4 text-[#64748b]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#0f172a] text-sm">모의고사 {s.round}회</p>
                    <p className="text-xs text-[#94a3b8]">{new Date(s.completed_at!).toLocaleDateString("ko-KR")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-[#334155]">{s.score}/{s.total}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pass ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-500"}`}>
                      {pct}점
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// 등급 구간 게이지 — 예상 점수 위치를 색 구간 위에 마커로 표시
function ScoreGauge({ predicted }: { predicted: number }) {
  const segs = [
    { w: 550, c: "bg-slate-200" },
    { w: 80, c: "bg-amber-200" },
    { w: 80, c: "bg-amber-400" },
    { w: 80, c: "bg-sky-300" },
    { w: 80, c: "bg-blue-500" },
    { w: 130, c: "bg-emerald-500" },
  ];
  const pos = Math.max(0, Math.min(100, predicted / 10));
  const marks = [
    { at: 550, label: "준3급" },
    { at: 630, label: "3급" },
    { at: 710, label: "준2급" },
    { at: 790, label: "2급" },
    { at: 870, label: "1급" },
  ];
  return (
    <div className="relative pt-5">
      <div className="absolute top-0" style={{ left: `${pos}%`, transform: "translateX(-50%)" }}>
        <div className="text-[10px] font-black text-[#1e3a5f] whitespace-nowrap text-center">{predicted}</div>
        <div className="w-0.5 h-2 bg-[#1e3a5f] mx-auto" />
      </div>
      <div className="flex h-3 rounded-full overflow-hidden">
        {segs.map((s, i) => (
          <div key={i} className={s.c} style={{ width: `${s.w / 10}%` }} />
        ))}
      </div>
      <div className="relative h-4 mt-1">
        {marks.map(m => (
          <span key={m.label} className="absolute text-[9px] text-[#94a3b8]" style={{ left: `${m.at / 10}%`, transform: "translateX(-50%)" }}>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
