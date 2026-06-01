import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Trophy, RotateCcw, LayoutDashboard, Star } from 'lucide-react'
import { getActiveSubscription } from '@/lib/subscription'
import { scaleTo1000, tierFor } from '@/lib/grade'
import ManuscriptGrid from '@/components/manuscript/ManuscriptGrid'
import EssayGrader from '@/components/cbt/EssayGrader'
import type { EssayGrade } from '@/app/(main)/cbt/actions'

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
    .select('id, year, round, score, total, started_at, completed_at')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session?.completed_at) redirect('/cbt')

  const [{ data: answers }, { data: questions }, subscription] = await Promise.all([
    supabase.from('quiz_answers').select('question_id, user_answer, is_correct, ai_score, ai_feedback').eq('session_id', sessionId),
    supabase.from('questions').select('id, number, type, points, question, options, correct_answer, explanation').eq('year', session.year).eq('round', session.round).order('number'),
    getActiveSubscription(user.id),
  ])

  const answerMap = new Map((answers ?? []).map(a => [a.question_id, a]))
  const allQuestions = questions ?? []
  const autoQuestions = allQuestions.filter(q => q.type !== 'essay')
  const essayQuestions = allQuestions.filter(q => q.type === 'essay')

  // 배점 기반 점수 계산
  const totalPoints = allQuestions.reduce((s, q) => s + (q.points ?? 0), 0)
  let earnedPoints = 0
  for (const q of allQuestions) {
    const a = answerMap.get(q.id)
    if (!a) continue
    if (q.type === 'essay') earnedPoints += a.ai_score ?? 0
    else if (a.is_correct) earnedPoints += q.points ?? 0
  }
  const essaysGraded = essayQuestions.every(q => answerMap.get(q.id)?.ai_score != null)

  const scaled = scaleTo1000(earnedPoints, totalPoints)
  const tier = tierFor(scaled)
  const isPass = tier.name !== '미달'

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
          <div className="text-6xl font-black mb-1 tracking-tight">{scaled}<span className="text-2xl">점</span></div>
          <div className="text-white/70 text-sm mb-4">획득 {earnedPoints} / {totalPoints}점 · 1000점 환산</div>
          <div className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-white/20">
            {isPass ? <Star className="h-4 w-4 fill-current" /> : null}
            {isPass ? `${tier.name} 합격권` : '등급 미달 — 다시 도전하세요'}
          </div>
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
        </div>
      </div>

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

      {/* 서술형 — 원고지 답안 + AI 채점 */}
      {essayQuestions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-bold text-[#0f172a] mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-black">서</span>
            서술형 ({essayQuestions.length}문항)
          </h2>
          <div className="space-y-4">
            {essayQuestions.map(q => {
              const a = answerMap.get(q.id)
              return (
                <div key={q.id} className="bg-white rounded-2xl border-2 border-amber-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{q.number}번 서술형</span>
                    <span className="text-xs text-[#94a3b8]">{q.points}점</span>
                  </div>
                  <p className="text-[#334155] text-sm font-medium mb-4 whitespace-pre-wrap leading-relaxed">{q.question}</p>
                  {a?.user_answer ? (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-[#64748b] mb-1.5">내 답안 (원고지)</p>
                      <ManuscriptGrid text={a.user_answer} cols={20} rows={Math.max(10, Math.ceil((q.points ?? 100) / 20) + 4)} />
                    </div>
                  ) : (
                    <p className="text-xs text-[#94a3b8] mb-3">(미작성)</p>
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
                    <summary className="cursor-pointer text-xs font-semibold text-amber-700 hover:underline">모범 답안 보기</summary>
                    <div className="mt-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <p className="text-sm text-[#334155] whitespace-pre-wrap leading-relaxed">{q.correct_answer}</p>
                    </div>
                  </details>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 객관식·단답형 결과 */}
      {autoQuestions.length > 0 && (
        <>
          <h2 className="text-base font-bold text-[#0f172a] mb-4">객관식·단답형 상세 결과</h2>
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
                      {isCorrect ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'}`}>
                        {q.number}번 {isCorrect ? '정답' : '오답'}
                      </span>
                      <span className="text-xs text-[#94a3b8]">{q.points}점</span>
                      <p className="text-[#334155] font-medium text-sm mt-2 leading-relaxed whitespace-pre-wrap">{q.question}</p>
                    </div>
                  </div>
                  {!isCorrect && (
                    <div className="ml-10 space-y-1.5 text-sm">
                      <div className="flex gap-2 items-start">
                        <span className="text-red-400 font-semibold shrink-0 text-xs">내 답변</span>
                        <span className="text-[#64748b] text-xs">{userLabel}</span>
                      </div>
                      <div className="flex gap-2 items-start">
                        <span className="text-emerald-600 font-semibold shrink-0 text-xs">정 답</span>
                        <span className="text-[#334155] font-medium text-xs">{correctLabel}</span>
                      </div>
                    </div>
                  )}
                  {q.explanation && !isCorrect && (
                    <div className="ml-10 mt-3 bg-[#f0f7ff] border border-blue-100 rounded-xl px-4 py-3 text-xs text-[#1e4a8f] leading-relaxed">
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
