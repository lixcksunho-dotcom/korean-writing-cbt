import { createClient } from '@/lib/supabase/server'
import { redirectToLogin } from '@/lib/loginRedirect'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Target, NotebookPen, ChevronRight, CheckCircle2, XCircle, BarChart3 } from 'lucide-react'
import { getActiveProgram } from '@/lib/programContext'
import { getProgram } from '@/lib/programs'
import { questionBank } from '@/lib/questionBank'

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirectToLogin('/insights')

  // 리포트는 현재 보고 있는 시험 기준 — 두 시험의 기록이 한 그래프에 섞이면 추이가 무의미해진다.
  const program = await getActiveProgram()
  const cfg = getProgram(program)
  const BANDS = cfg.areas.map((a, i) => ({ label: a.name, lo: a.from, hi: a.to, href: `/practice/areas?a=${i}` }))

  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id, year, round, score, total, completed_at')
    .eq('user_id', user.id)
    .eq('program', program)
    // 연습 전용 센티넬(year>=9000) 기록은 성적 추이에서 제외
    .lt('year', 9000)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true })

  const completed = sessions ?? []

  // 데이터 없을 때
  if (completed.length === 0) {
    return (
      <div className="animate-fade-up max-w-2xl mx-auto">
        <BackLink />
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-[#e2e8f0]">
          <div className="bg-[#f1f5f9] p-5 rounded-2xl mb-4"><BarChart3 className="h-10 w-10 text-[#475569]" /></div>
          {/* 빈 화면이라고 제목까지 없으면 낭독기는 이 화면이 무엇인지 말할 수가 없다 */}
          <h1 className="text-lg font-black text-[#0f172a] mb-1">학습 리포트</h1>
          <p className="text-[#64748b] text-sm font-medium">아직 분석할 학습 기록이 없어요.</p>
          <p className="text-[#64748b] text-xs mt-1 mb-5">모의고사를 풀면 성적 추이와 약점이 여기에 쌓여요.</p>
          <Link href="/cbt" className="btn-primary inline-flex items-center gap-1.5 text-white font-bold px-5 py-3.5 rounded-xl text-sm">
            첫 모의고사 풀기 <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  const sessionMeta = new Map(completed.map(s => [s.id as string, s]))

  // 객관식 답안(is_correct가 boolean) 전부 + 문제 메타
  const { data: rawAnswers } = await supabase
    .from('quiz_answers')
    .select('session_id, question_id, user_answer, is_correct')
    .in('session_id', completed.map(s => s.id))
    .not('is_correct', 'is', null)

  const answers = (rawAnswers ?? []).slice().sort((a, b) => {
    const da = new Date(sessionMeta.get(a.session_id as string)?.completed_at as string).getTime()
    const db = new Date(sessionMeta.get(b.session_id as string)?.completed_at as string).getTime()
    return da - db
  })

  // 문항별 '가장 최근' 답안만 남김(현재 실력 기준)
  const latestByQ = new Map<string, typeof answers[number]>()
  for (const a of answers) latestByQ.set(a.question_id as string, a)
  const latest = [...latestByQ.values()]

  const qids = [...new Set(latest.map(a => a.question_id as string))]
  const { data: qrows } = await questionBank()
    .from('questions')
    .select('id, year, round, number, question, options, correct_answer, explanation')
    .in('id', qids)
  const qmap = new Map((qrows ?? []).map(q => [q.id as string, q]))

  // ── 성적 추이 (객관식 정답률) ──
  const trend = completed.map(s => ({
    round: s.round as number,
    date: new Date(s.completed_at as string),
    pct: s.total ? Math.round(((s.score ?? 0) / (s.total as number)) * 100) : 0,
  }))
  const pcts = trend.map(t => t.pct)
  const latestPct = pcts[pcts.length - 1]
  const bestPct = Math.max(...pcts)
  const avgPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
  const delta = pcts.length >= 2 ? latestPct - pcts[0] : 0

  // ── 영역별 약점 (최근 실력 기준) ──
  const bandStats = BANDS.map(b => {
    const inBand = latest.filter(a => {
      const n = qmap.get(a.question_id as string)?.number as number | undefined
      return n != null && n >= b.lo && n <= b.hi
    })
    const correct = inBand.filter(a => a.is_correct).length
    return { ...b, total: inBand.length, correct, pct: inBand.length ? Math.round((correct / inBand.length) * 100) : 0 }
  }).filter(b => b.total > 0)
  const weakest = bandStats.length ? bandStats.reduce((m, b) => (b.pct < m.pct ? b : m)) : null

  // ── 오답노트 (현재도 틀리는 문항) ──
  const wrong = latest
    .filter(a => !a.is_correct && qmap.has(a.question_id as string))
    .map(a => ({ a, q: qmap.get(a.question_id as string)! }))
    .sort((x, y) => ((x.q.round as number) - (y.q.round as number)) || ((x.q.number as number) - (y.q.number as number)))

  const trendIcon = delta > 2 ? <TrendingUp className="h-4 w-4 text-emerald-500" />
    : delta < -2 ? <TrendingDown className="h-4 w-4 text-red-600" />
    : <Minus className="h-4 w-4 text-[#64748b]" />

  return (
    <div className="animate-fade-up max-w-3xl">
      <BackLink />
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">학습 리포트</h1>
        <p className="text-[#64748b] text-sm">모의고사 {completed.length}회 기록을 바탕으로 성적 추이와 약점을 분석했어요.</p>
      </div>

      {/* 성적 추이 */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-5 sm:p-6 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-5 w-5 text-[#1e3a5f]" />
          <h2 className="text-base font-bold text-[#0f172a]">객관식 정답률 추이</h2>
        </div>
        <p className="text-xs text-[#64748b] mb-4">모의고사를 풀수록 정답률이 어떻게 변하는지 보여줘요. (서술형 점수는 각 결과 화면에서 확인)</p>

        <div className="grid grid-cols-4 gap-2 mb-5">
          <Stat label="최근" value={`${latestPct}%`} />
          <Stat label="최고" value={`${bestPct}%`} />
          <Stat label="평균" value={`${avgPct}%`} />
          <Stat label="변화" value={`${delta >= 0 ? '+' : ''}${delta}%p`} icon={trendIcon} />
        </div>

        {/* 막대 차트 */}
        <div className="flex items-end gap-1.5 h-40 border-b border-[#f1f5f9] pb-0">
          {trend.map((t, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
              <span className="text-xs font-bold text-[#64748b] tabular-nums">{t.pct}</span>
              <div
                className={`w-full rounded-t-md ${t.pct >= 80 ? 'bg-emerald-400' : t.pct >= 60 ? 'bg-amber-400' : 'bg-red-300'}`}
                style={{ height: `${Math.max(4, t.pct)}%` }}
                title={`${t.round}회 · ${t.pct}%`}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 mt-1.5">
          {trend.map((t, i) => (
            <span key={i} className="flex-1 text-center text-xs text-[#64748b] truncate">{t.round}회</span>
          ))}
        </div>
      </div>

      {/* 영역별 약점 */}
      {bandStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-5 sm:p-6 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-5 w-5 text-[#1e3a5f]" />
            <h2 className="text-base font-bold text-[#0f172a]">영역별 약점 추적</h2>
          </div>
          <p className="text-xs text-[#64748b] mb-4">전체 기록을 합쳐 영역별 정답률을 계산했어요. 낮은 영역을 집중 연습하세요.</p>
          <div className="space-y-3.5">
            {bandStats.map(b => {
              const isWeak = weakest?.label === b.label && b.pct < 100
              const color = b.pct >= 80 ? 'bg-emerald-500' : b.pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
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
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${b.pct}%` }} />
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
        </div>
      )}

      {/* 오답노트 */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <NotebookPen className="h-5 w-5 text-[#1e3a5f]" />
          <h2 className="text-base font-bold text-[#0f172a]">오답노트</h2>
          <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">{wrong.length}문항</span>
          {wrong.length > 0 && (
            <Link href="/practice/wrong" className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-white bg-[#1e3a5f] hover:bg-[#2d5488] px-3 py-1.5 rounded-lg transition-colors">
              오답만 다시 풀기 <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <p className="text-xs text-[#64748b] mb-4">지금도 틀리는 객관식만 모았어요. 해설을 보며 약점을 메우세요.</p>

        {wrong.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <CheckCircle2 className="h-4 w-4" /> 현재 틀리는 객관식이 없어요. 훌륭해요!
          </div>
        ) : (
          <div className="space-y-2.5">
            {wrong.map(({ a, q }) => {
              const options = q.options as string[] | null
              const mine = (a.user_answer as string) || ''
              const mineLabel = mine && options ? `${mine}번 ${options[parseInt(mine) - 1] ?? ''}` : (mine || '(미답변)')
              const correctLabel = options ? `${q.correct_answer}번 ${options[parseInt(q.correct_answer as string) - 1] ?? ''}` : (q.correct_answer as string)
              return (
                <details key={q.id as string} className="group bg-[#f8fafc] border border-[#e2e8f0] rounded-xl overflow-hidden">
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-start gap-2.5 hover:bg-[#f1f5f9] transition-colors">
                    <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#64748b]">모의고사 {q.round}회 {q.number}번</span>
                      <p className="text-sm text-[#334155] font-medium leading-snug line-clamp-2">{q.question as string}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#64748b] group-open:rotate-90 transition-transform shrink-0 mt-0.5" />
                  </summary>
                  <div className="px-4 pb-4 pt-1 text-sm space-y-1.5">
                    <div className="flex gap-2"><span className="text-red-600 font-semibold text-xs shrink-0">내 답</span><span className="text-[#64748b] text-xs">{mineLabel}</span></div>
                    <div className="flex gap-2"><span className="text-emerald-700 font-semibold text-xs shrink-0">정답</span><span className="text-[#334155] font-medium text-xs">{correctLabel}</span></div>
                    {q.explanation ? (
                      <div className="mt-2 bg-[#f0f7ff] border border-blue-100 rounded-lg px-3 py-2 text-xs text-[#1e4a8f] leading-relaxed">💡 {q.explanation as string}</div>
                    ) : null}
                  </div>
                </details>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link href="/dashboard" className="inline-flex items-center gap-1.5 py-3 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
      <ArrowLeft className="h-4 w-4" /> 대시보드
    </Link>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-[#f8fafc] rounded-xl p-3 text-center">
      <div className="text-lg font-black text-[#0f172a] tracking-tight flex items-center justify-center gap-1">{icon}{value}</div>
      <div className="text-xs text-[#64748b] mt-0.5">{label}</div>
    </div>
  )
}
