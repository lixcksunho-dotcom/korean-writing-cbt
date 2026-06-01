import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Trophy, RotateCcw, LayoutDashboard, Star } from 'lucide-react'

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

  const [{ data: answers }, { data: questions }] = await Promise.all([
    supabase.from('quiz_answers').select('question_id, user_answer, is_correct').eq('session_id', sessionId),
    supabase.from('questions').select('id, number, type, question, options, correct_answer, explanation').eq('year', session.year).eq('round', session.round).order('number'),
  ])

  const answerMap = new Map((answers ?? []).map(a => [a.question_id, a]))
  const allQuestions = questions ?? []
  const autoQuestions = allQuestions.filter(q => q.type !== 'essay')
  const essayQuestions = allQuestions.filter(q => q.type === 'essay')
  const score = session.score ?? 0
  const total = session.total ?? autoQuestions.length
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const pass = pct >= 80

  const timeTaken = session.completed_at && session.started_at
    ? Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000)
    : null

  return (
    <div className="animate-fade-up max-w-2xl mx-auto">
      {/* 점수 카드 */}
      <div className="relative overflow-hidden rounded-2xl mb-6 text-white text-center p-10">
        <div className={`absolute inset-0 ${pass
          ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
          : 'bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f]'
        }`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.1)_0%,transparent_70%)]" />
        <div className="relative">
          <div className={`inline-flex p-4 rounded-2xl mb-4 ${pass ? 'bg-white/20' : 'bg-white/10'}`}>
            <Trophy className="h-10 w-10" />
          </div>
          <div className="text-6xl font-black mb-1 tracking-tight">{pct}점</div>
          <div className="text-white/70 text-lg mb-4">{score} / {total} 정답</div>
          <div className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold ${pass ? 'bg-white/20' : 'bg-white/10'}`}>
            {pass ? <Star className="h-4 w-4 fill-current" /> : null}
            {pass ? '합격권 ✓' : '불합격 — 다시 도전하세요'}
          </div>
          {timeTaken && (
            <p className="text-white/40 text-sm mt-4">
              소요 시간 {Math.floor(timeTaken / 60)}분 {timeTaken % 60}초
            </p>
          )}
        </div>
      </div>

      {/* 점수 분석 바 */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-6 mb-5">
        <h2 className="font-bold text-[#0f172a] mb-4 text-sm uppercase tracking-wide">점수 분석</h2>
        <div className="flex items-end gap-1 h-16 mb-2">
          {(questions ?? []).map(q => {
            const a = answerMap.get(q.id)
            const correct = a?.is_correct ?? false
            return (
              <div key={q.id} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full rounded-t-sm transition-all ${correct ? 'bg-emerald-400' : 'bg-red-300'}`}
                  style={{ height: correct ? '100%' : '40%' }} />
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3 text-xs text-[#94a3b8] pt-2 border-t border-[#f1f5f9]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />정답 {score}개</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-300 inline-block" />오답 {total - score}개</span>
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

      {/* 서술형 모범 답안 */}
      {essayQuestions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-bold text-[#0f172a] mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-black">서</span>
            서술형 모범 답안
          </h2>
          <div className="space-y-4">
            {essayQuestions.map(q => {
              const a = answerMap.get(q.id)
              return (
                <div key={q.id} className="bg-white rounded-2xl border-2 border-amber-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{q.number}번 서술형</span>
                  </div>
                  <p className="text-[#334155] text-sm font-medium mb-4 whitespace-pre-wrap leading-relaxed">{q.question}</p>
                  {a?.user_answer && (
                    <div className="mb-3 bg-[#f8fafc] rounded-xl p-3">
                      <p className="text-xs font-semibold text-[#64748b] mb-1.5">내 답안</p>
                      <p className="text-sm text-[#334155] whitespace-pre-wrap leading-relaxed">{a.user_answer}</p>
                    </div>
                  )}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1.5">모범 답안</p>
                    <p className="text-sm text-[#334155] whitespace-pre-wrap leading-relaxed">{q.correct_answer}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 객관식·단답형 문제별 결과 */}
      <h2 className="text-base font-bold text-[#0f172a] mb-4">문제별 상세 결과</h2>
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
            <div
              key={q.id}
              className={`bg-white rounded-2xl border-2 p-5 ${isCorrect ? 'border-emerald-200' : 'border-red-100'}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-100' : 'bg-red-50'}`}>
                  {isCorrect
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    : <XCircle className="h-4 w-4 text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'}`}>
                    {q.number}번 {isCorrect ? '정답' : '오답'}
                  </span>
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
    </div>
  )
}
