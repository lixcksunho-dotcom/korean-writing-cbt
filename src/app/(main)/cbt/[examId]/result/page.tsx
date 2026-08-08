import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Trophy, RotateCcw, LayoutDashboard, Star, Target, Sparkles, ChevronRight, Lock } from 'lucide-react'
import { getActiveSubscription } from '@/lib/subscription'
import { FREE_AI_TRIAL } from '@/lib/aiTrial'
import { scaleToMax, tierFor } from '@/lib/grade'
import { getProgram, type ProgramId } from '@/lib/programs'
import ManuscriptGrid from '@/components/manuscript/ManuscriptGrid'
import EssayGrader from '@/components/cbt/EssayGrader'
import { AiTrialProvider } from '@/components/cbt/AiTrialContext'
import BookmarkButton from '@/components/study/BookmarkButton'
import ReportButton from '@/components/study/ReportButton'
import PaperShareButton from '@/components/result/PaperShareButton'
import CopyGuard from '@/components/cbt/CopyGuard'
import MarkedText from '@/components/cbt/MarkedText'
import type { EssayGrade } from '@/app/(main)/cbt/actions'
import { questionBank } from '@/lib/questionBank'

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>
  searchParams: Promise<{ session?: string }>
}) {
  const { examId } = await params
  const { session: sessionId } = await searchParams
  if (!sessionId) redirect('/cbt')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('id, program, year, round, score, total, started_at, completed_at')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session?.completed_at) redirect('/cbt')

  // 이 세션이 어떤 시험(실글/KBS)인지 → 채점 만점·등급·영역을 그에 맞게.
  const program = (session.program as ProgramId) ?? 'silyong'
  const cfg = getProgram(program)

  const [{ data: answers }, { data: questions }, subscription, { data: bookmarkRows }, { data: allRounds }] = await Promise.all([
    supabase.from('quiz_answers').select('question_id, user_answer, is_correct, ai_score, ai_feedback').eq('session_id', sessionId),
    questionBank().from('questions').select('id, number, type, points, question, options, correct_answer, explanation').eq('program', program).eq('year', session.year).eq('round', session.round).order('number'),
    getActiveSubscription(user.id),
    supabase.from('bookmarks').select('question_id').eq('user_id', user.id),
    // 업셀 문구의 '몇 회분이 열리는지'를 실제 보유 회차에서 뽑는다(하드코딩 수치가 낡는 것 방지)
    questionBank().from('questions').select('round').eq('program', program).lt('year', 9000),
  ])
  const lockedRoundCount = Math.max(
    0,
    new Set((allRounds ?? []).map(r => r.round)).size - cfg.freeRounds,
  )
  const bookmarkSet = new Set((bookmarkRows ?? []).map(b => b.question_id as string))

  const answerMap = new Map((answers ?? []).map(a => [a.question_id, a]))
  const allQuestions = questions ?? []
  const autoQuestions = allQuestions.filter(q => q.type !== 'essay')
  const essayQuestions = allQuestions.filter(q => q.type === 'essay')
  // 이번 시험에서 틀린 객관식 수 — 결과 화면에서 곧바로 '틀린 것만' 다시 풀게 한다.
  const wrongCount = autoQuestions.filter(q => answerMap.get(q.id)?.is_correct === false).length

  // 배점 기반 점수 계산
  const totalPoints = allQuestions.reduce((s, q) => s + (q.points ?? 0), 0)
  let earnedPoints = 0
  for (const q of allQuestions) {
    const a = answerMap.get(q.id)
    if (!a) continue
    if (q.type === 'essay') earnedPoints += a.ai_score ?? 0
    else if (a.is_correct) earnedPoints += q.points ?? 0
  }
  const gradedEssayCount = essayQuestions.filter(q => answerMap.get(q.id)?.ai_score != null).length
  const essaysGraded = gradedEssayCount === essayQuestions.length

  const scaled = scaleToMax(earnedPoints, totalPoints, program)
  const tier = tierFor(scaled, program)
  const isPass = tier.name !== cfg.belowLabel

  // 비구독자 무료 AI 체험 잔여 — 이미 받은 user에서 계산(추가 getUser 왕복 제거)
  const trialUsed = Number(user.app_metadata?.ai_trial_used ?? 0)
  const aiTrial = { remaining: subscription ? 0 : Math.max(0, FREE_AI_TRIAL - trialUsed) }

  // 체험 3회를 9문항 어디에 쓸지 몰라 손을 안 대는 선택 마비가 관찰됨(완료 16명 중 체험 3명).
  // 배점 상위 문항(체험 횟수만큼)을 데이터에서 뽑아 추천한다 — 회차마다 배점이 다를 수 있다.
  const recommendedEssayIds = new Set(
    [...essayQuestions]
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      .slice(0, FREE_AI_TRIAL)
      .map(q => q.id),
  )
  const recommendedPointsSum = essayQuestions
    .filter(q => recommendedEssayIds.has(q.id))
    .reduce((s, q) => s + (q.points ?? 0), 0)
  const showEssayRecommend = !subscription && aiTrial.remaining > 0

  // 영역별 약점 분석(객관식 번호 구간 기준) — 시험별 영역 정의(programs.ts)
  // 약한 영역을 곧바로 이어 풀 수 있게, 영역별 연습으로 연결한다.
  const BANDS = cfg.areas.map((a, i) => ({ label: a.name, lo: a.from, hi: a.to, href: `/practice/areas?a=${i}` }))
  const bandStats = BANDS.map(b => {
    const qs = autoQuestions.filter(q => (q.number ?? 0) >= b.lo && (q.number ?? 0) <= b.hi)
    const correct = qs.filter(q => answerMap.get(q.id)?.is_correct).length
    return { ...b, total: qs.length, correct, pct: qs.length ? Math.round((correct / qs.length) * 100) : 0 }
  }).filter(b => b.total > 0)
  const weakest = bandStats.length
    ? bandStats.reduce((min, b) => (b.pct < min.pct ? b : min))
    : null

  const timeTaken = session.completed_at && session.started_at
    ? Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000)
    : null

  const tierColorMap: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-[#1e3a5f] to-[#2d5488]',
    amber: 'from-amber-500 to-amber-600',
    slate: 'from-slate-600 to-slate-800',
  }

  return (
    <div className="animate-fade-up max-w-2xl mx-auto">
      {/* 점수/등급 카드 */}
      <div className="relative overflow-hidden rounded-2xl mb-6 text-white text-center p-10">
        <div className={`absolute inset-0 bg-gradient-to-br ${tierColorMap[tier.color] ?? tierColorMap.slate}`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12)_0%,transparent_70%)]" />
        <div className="relative">
          <div className="inline-flex p-4 rounded-2xl mb-4 bg-white/15">
            <Trophy className="h-10 w-10" />
          </div>
          <div className="text-4xl sm:text-5xl md:text-6xl font-black mb-1 tracking-tight">{scaled}<span className="text-2xl">점</span></div>
          <div className="text-white/70 text-sm mb-4">획득 {earnedPoints} / {totalPoints}점 · {cfg.maxScore}점 환산</div>
          {/* 서술형이 채점 전이면 등급을 말하지 않는다. 서술형이 700점인데 객관식만으로
              '미달'이라고 하면 사실과 다르다 — 객관식을 다 맞혀도 300점이라 늘 미달로 나온다. */}
          {!essaysGraded && essayQuestions.length > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-white/20">
              {gradedEssayCount > 0
                ? `서술형 ${essayQuestions.length}문항 중 ${gradedEssayCount}문항 채점됨 · 모두 채점하면 등급이 나와요`
                : `서술형 ${essayQuestions.length}문항을 모두 채점하면 등급이 나와요`}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-white/20">
              {isPass ? <Star className="h-4 w-4 fill-current" /> : null}
              {isPass ? `${tier.name}${program === 'silyong' ? ' 합격권' : ' 예상'}` : `${cfg.belowLabel} — 다시 도전하세요`}
            </div>
          )}
          {/* KBS는 주관처가 절대 등급컷을 공개하지 않는다 — 참고용임을 분명히 알린다 */}
          {program === 'kbs' && (
            <p className="text-white/50 text-xs mt-3">
              ※ KBS한국어능력시험은 공식 등급컷을 공개하지 않아, 학습 참고용 근사 기준으로 계산한 예상 등급입니다.
            </p>
          )}
          {!essaysGraded && essayQuestions.length > 0 && (
            <p className="text-white/50 text-xs mt-4">
              ※ 서술형 AI 채점 전 점수입니다. 아래에서 채점하면 점수에 반영됩니다.
            </p>
          )}
          {timeTaken && (
            <p className="text-white/40 text-sm mt-2">
              소요 시간 {Math.floor(timeTaken / 60)}분 {timeTaken % 60}초
            </p>
          )}
          <div className="flex justify-center mt-5">
            <PaperShareButton round={session.round as number} scaled={scaled} tier={tier.name} examName={cfg.examName} maxScore={cfg.maxScore} below={cfg.belowLabel} />
          </div>
        </div>
      </div>

      {/* 서술형을 써 놓고도 채점을 안 받고 나가는 사람이 많다(시험 완료 16명 중 3명만 체험).
          안내가 문항마다 붙어 있긴 한데 문서 9~36% 지점이라, 점수만 보고 떠나면 만나지 못한다.
          이미 답을 써 뒀고 무료 체험도 남은 사람에게만, 모두가 도착하는 이 자리에서 한 번 알린다. */}
      {!subscription && aiTrial.remaining > 0 && essayQuestions.length > 0 && !essaysGraded && (
        <a
          href="#essay-section"
          className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-[#d97706] px-5 py-4 text-[#0f172a]"
        >
          <Sparkles className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black">
              서술형 {essayQuestions.length}문항, 아직 채점 전이에요
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-[#3b2005]">
              무료 체험 {aiTrial.remaining}회가 남아 있어요. 조건 충족·맞춤법·구성을 항목별로 짚어 줍니다.
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" />
        </a>
      )}

      {/* 오답 즉시 재도전 — '틀린 것만 반복'이 자격증 CBT 학습의 핵심 루프 */}
      {wrongCount > 0 && (
        <Link href="/practice/wrong" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl mb-3 bg-amber-400 text-[#1e3a5f] font-black text-sm hover:bg-amber-300 transition-colors">
          <XCircle className="h-4 w-4" />
          틀린 {wrongCount}문항 바로 다시 풀기
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}

      {/* 버튼 */}
      <div className="flex gap-3 mb-8">
        <Link href={`/cbt/${examId}`} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-[#1e3a5f] text-[#1e3a5f] font-bold text-sm hover:bg-[#1e3a5f]/5 transition-colors">
          <RotateCcw className="h-4 w-4" />
          다시 풀기
        </Link>
        <Link href="/dashboard" className="flex-1 btn-primary flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm">
          <LayoutDashboard className="h-4 w-4" />
          대시보드
        </Link>
      </div>

      {/* 약점 분석 — 영역별 정답률 (구독 전용) */}
      {bandStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Target className="h-5 w-5 text-[#1e3a5f]" />
            <h2 className="text-base font-bold text-[#0f172a]">영역별 약점 분석</h2>
            {!subscription && <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">구독 전용</span>}
          </div>
          <p className="text-xs text-[#64748b] mb-4">객관식 정답률을 영역별로 나눠 봤어요. 낮은 영역을 집중 연습하면 점수가 가장 빨리 올라요.</p>

          {subscription ? (
            <>
              <div className="space-y-3.5">
                {bandStats.map(b => {
                  const isWeak = weakest?.label === b.label && b.pct < 100
                  const barColor = b.pct >= 80 ? 'bg-emerald-500' : b.pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
                  return (
                    <div key={b.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-[#334155] flex items-center gap-1.5">
                          {b.label}
                          {isWeak && <span className="text-xs font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">약점</span>}
                        </span>
                        <span className="text-xs font-bold text-[#64748b] tabular-nums">{b.correct}/{b.total} · {b.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${b.pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {weakest && weakest.pct < 100 && (
                <Link href={weakest.href} className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-[#1e3a5f]/5 text-[#1e3a5f] text-sm font-bold hover:bg-[#1e3a5f]/10 transition-colors">
                  <Target className="h-4 w-4" /> ‘{weakest.label}’ 집중 연습하기
                </Link>
              )}
            </>
          ) : (
            // 비구독자: 블러 처리된 미리보기 + 잠금 오버레이로 구독 유도
            <div className="relative">
              <div className="space-y-3.5 blur-[5px] select-none pointer-events-none" aria-hidden>
                {bandStats.map(b => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-[#334155]">{b.label}</span>
                      <span className="text-xs font-bold text-[#64748b]">●●% </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                      <div className="h-full rounded-full bg-[#cbd5e1]" style={{ width: '60%' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2.5">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-100"><Lock className="h-4 w-4 text-amber-700" /></span>
                <p className="text-sm font-bold text-[#334155]">내 약점 영역, 구독하면 바로 확인</p>
                <Link href="/subscribe" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-[#1e3a5f] text-xs font-black hover:bg-amber-300 transition-colors">
                  구독하고 약점 분석 보기 <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 비구독자 전환 유도 */}
      {!subscription && (
        <div className="relative overflow-hidden rounded-2xl mb-8 p-6 text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] to-[#2d5488]" />
          <div className="relative">
            <p className="text-xs font-bold text-amber-300 mb-1">합격까지 더 빠르게</p>
            <h3 className="text-lg font-black mb-3">구독하면 이런 게 열려요</h3>
            <ul className="space-y-1.5 text-sm text-white/90 mb-5">
              {essayQuestions.length > 0 && (
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-300 shrink-0" /> 서술형 {essayQuestions.length}문항 <b>AI 첨삭·점수 무제한</b></li>
              )}
              <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-300 shrink-0" /> 영역별 <b>약점 분석</b> · 시험 <b>저장하고 이어풀기</b></li>
              {lockedRoundCount > 0 && (
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-300 shrink-0" /> 잠긴 <b>모의고사 {lockedRoundCount}회분</b> 전체 + 유형별 집중 연습</li>
              )}
            </ul>
            <Link href="/subscribe" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-[#1e3a5f] font-black text-sm hover:bg-amber-300 transition-colors">
              5,500원으로 30일 무제한 <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* 서술형 — 원고지 답안 + AI 채점 */}
      {essayQuestions.length > 0 && (
        <AiTrialProvider initialRemaining={aiTrial.remaining}>
        <div id="essay-section" className="mb-8 scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#0f172a] flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-black">서</span>
              서술형 ({essayQuestions.length}문항)
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {subscription ? 'AI 분석' : aiTrial.remaining > 0 ? `무료 체험 ${aiTrial.remaining}회 · AI 분석` : '구독 전용 · AI 분석'}
              </span>
              <span className="text-xs font-bold text-[#475569] bg-[#f1f5f9] px-2 py-0.5 rounded-full tabular-nums">
                {essayQuestions.length}문항 중 {gradedEssayCount}문항 채점됨
              </span>
            </h2>
            <p className="text-xs text-[#64748b] mt-1.5">
              내가 쓴 답안을 AI가 모범 답안과 비교해 <b className="text-amber-700">점수·첨삭</b>으로 분석해 드려요.
              {!subscription && (aiTrial.remaining > 0
                ? ` 구독 없이 무료 ${aiTrial.remaining}회 체험할 수 있어요. 모범 답안은 언제나 무료예요.`
                : ' (AI 분석은 구독 시 이용할 수 있어요. 모범 답안은 무료로 볼 수 있어요.)')}
            </p>
            {showEssayRecommend && recommendedPointsSum > 0 && (
              <p className="text-xs font-bold text-amber-700 mt-1">
                무료 체험 {aiTrial.remaining}회는 배점이 큰 {recommendedEssayIds.size}문항(합계 {recommendedPointsSum}점)에 쓰는 게 가장 이득이에요. 아래 <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[#1e3a5f] font-black">추천</span> 배지를 확인하세요.
              </p>
            )}
          </div>
          <div className="space-y-4">
            {essayQuestions.map((q, ei) => {
              const a = answerMap.get(q.id)
              const isManuscript = (q.points ?? 0) >= cfg.manuscriptMinPoints
              return (
                <div key={q.id} className="bg-white rounded-2xl border-2 border-amber-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">서술형 {ei + 1}번</span>
                    <span className="text-xs text-[#64748b]">{q.points}점</span>
                    {showEssayRecommend && recommendedEssayIds.has(q.id) && (
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-[#1e3a5f]">추천 · 배점 상위</span>
                    )}
                  </div>
                  <p className="text-[#334155] text-sm font-medium mb-4 whitespace-pre-wrap leading-relaxed">{q.question}</p>
                  {a?.user_answer ? (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-[#64748b] mb-1.5">내 답안{isManuscript ? ' (원고지)' : ''}</p>
                      {isManuscript ? (
                        <ManuscriptGrid text={a.user_answer} cols={20} rows={52} cell={24} />
                      ) : (
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 text-sm text-[#334155] whitespace-pre-wrap leading-relaxed">{a.user_answer}</div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748b] mb-3">(미작성)</p>
                  )}

                  {/* AI 채점 */}
                  <EssayGrader
                    sessionId={sessionId}
                    questionId={q.id}
                    points={q.points ?? 0}
                    initialGrade={(a?.ai_feedback as EssayGrade | null) ?? null}
                    hasSubscription={!!subscription}
                  />

                  {/* 모범 답안 */}
                  <details className="mt-3 group">
                    <summary className="cursor-pointer py-2 text-xs font-semibold text-amber-700 hover:underline">모범 답안 보기</summary>
                    <div className="mt-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <p className="text-sm text-[#334155] whitespace-pre-wrap leading-relaxed">{q.correct_answer}</p>
                    </div>
                  </details>
                </div>
              )
            })}
          </div>
        </div>
        </AiTrialProvider>
      )}

      {/* 객관식·단답형 결과 */}
      {autoQuestions.length > 0 && (
        <>
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#0f172a] flex items-center gap-2 flex-wrap">
              객관식 상세 결과
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">무료 해설</span>
            </h2>
            <p className="text-xs text-[#64748b] mt-1.5">정답과 해설은 누구나 무료로 볼 수 있어요.</p>
          </div>
          <div className="space-y-3">
            {autoQuestions.map(q => {
              const a = answerMap.get(q.id)
              const isCorrect = a?.is_correct ?? false
              const userAnswer = a?.user_answer ?? ''
              const options = q.options as string[] | null
              const userLabel = userAnswer && options
                ? `${userAnswer}번 ${options[parseInt(userAnswer) - 1] ?? ''}`
                : userAnswer || '(미답변)'
              const correctLabel = options
                ? `${q.correct_answer}번 ${options[parseInt(q.correct_answer) - 1] ?? ''}`
                : q.correct_answer

              return (
                <div key={q.id} className={`bg-white rounded-2xl border-2 p-5 ${isCorrect ? 'border-emerald-200' : 'border-red-100'}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-100' : 'bg-red-50'}`}>
                      {isCorrect ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {q.number}번 {isCorrect ? '정답' : '오답'}
                      </span>
                      <span className="text-xs text-[#64748b]">{q.points}점</span>
                      <p className="text-[#334155] font-medium text-sm mt-2 leading-relaxed whitespace-pre-wrap"><MarkedText text={q.question} /></p>
                    </div>
                  </div>
                  {!isCorrect && (
                    <div className="ml-10 space-y-1.5 text-sm">
                      <div className="flex gap-2 items-start">
                        <span className="text-red-700 font-semibold shrink-0 text-xs">내 답변</span>
                        <span className="text-[#64748b] text-xs">{userLabel}</span>
                      </div>
                      <div className="flex gap-2 items-start">
                        <span className="text-emerald-700 font-semibold shrink-0 text-xs">정 답</span>
                        <span className="text-[#334155] font-medium text-xs">{correctLabel}</span>
                      </div>
                    </div>
                  )}
                  {q.explanation && (
                    <div className="ml-10 mt-3 bg-[#f0f7ff] border border-blue-100 rounded-xl px-4 py-3 text-xs text-[#1e4a8f] leading-relaxed whitespace-pre-wrap">
                      💡 <span className="font-semibold">해설</span> {q.explanation}
                    </div>
                  )}
                  <div className="ml-10 mt-2.5 flex items-center gap-1.5">
                    <BookmarkButton questionId={q.id} initial={bookmarkSet.has(q.id)} />
                    <ReportButton questionId={q.id} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
      <CopyGuard />
    </div>
  )
}
