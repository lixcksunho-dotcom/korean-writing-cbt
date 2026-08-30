import { createClient } from '@/lib/supabase/server'
import { redirectToLogin } from '@/lib/loginRedirect'
import Link from 'next/link'
import { BookOpen, ChevronRight, Clock, FileQuestion, Trophy, Lock } from 'lucide-react'
import { getActiveSubscription } from '@/lib/subscription'
import ExamResumeAction from '@/components/cbt/ExamResumeAction'
import { isRoundLocked } from '@/lib/examAccess'
import { getActiveProgram } from '@/lib/programContext'
import { getProgram } from '@/lib/programs'
import { formatExamId } from '@/lib/examId'
import { questionBank } from '@/lib/questionBank'

export default async function CbtPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirectToLogin('/cbt')

  // 활성 시험 모드 — 이 목록은 해당 모드의 시험만 보여준다.
  const program = await getActiveProgram()
  const cfg = getProgram(program)

  // 독립적인 4개 조회를 병렬로 — 순차 왕복(4회) → 한 번에
  const [{ data: exams }, { data: sessions }, { data: inProgress }, subscription] = await Promise.all([
    questionBank()
      .from('questions')
      .select('year, round, type')
      .eq('program', program)
      .lt('year', 9000)
      .order('year', { ascending: true })
      .order('round', { ascending: true }),
    supabase
      .from('quiz_sessions')
      // id가 있어야 결과 페이지(/cbt/…/result?session=)로 보낼 수 있다.
      // 예전에는 점수만 읽어 와 '마지막 시도'를 글자로만 찍었는데, 그래서 이미 푼
      // 회차의 결과를 다시 볼 길이 아예 없었다 — 결제하고 서술형 채점을 이어 받으려던
      // 사람이 방금 푼 회차에 닿지 못했다(2026-08-28 문의).
      .select('id, year, round, score, total, completed_at')
      .eq('user_id', user.id)
      .eq('program', program)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false }),
    supabase
      .from('quiz_sessions')
      .select('id, year, round, saved_at, started_at')
      .eq('user_id', user.id)
      .eq('program', program)
      .is('completed_at', null)
      // startSession이 고르는 순서와 같아야 한다. 여기서 고른 세션 id로 브라우저
      // 임시본을 찾아 '이어풀기'를 띄우는데, 실제로 이어지는 세션과 다르면
      // 배지는 떠 있고 눌러 보면 빈 화면이 나온다.
      .order('saved_at', { ascending: false, nullsFirst: false })
      .order('started_at', { ascending: false }),
    getActiveSubscription(user.id),
  ])

  const uniqueExams = exams
    ? [...new Map(exams.map(e => [`${e.year}-${e.round}`, e])).values()]
    : []

  const countMap = new Map<string, number>()
  for (const e of exams ?? []) {
    const k = `${e.year}-${e.round}`
    countMap.set(k, (countMap.get(k) ?? 0) + 1)
  }

  const sessionMap = new Map((sessions ?? []).map(s => [`${s.year}-${s.round}`, s]))
  // 서버 중간저장(유료)이 있는 회차
  const resumable = new Set((inProgress ?? []).filter(s => s.saved_at).map(s => `${s.year}-${s.round}`))
  // 회차별 '가장 최근 진행 중 세션' — 브라우저에 남은 임시본을 찾는 열쇠다.
  const openSession = new Map<string, string>()
  for (const s of inProgress ?? []) {
    const k = `${s.year}-${s.round}`
    if (!openSession.has(k)) openSession.set(k, s.id as string)
  }
  const hasSub = !!subscription

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">CBT 문제풀기</h1>
        <p className="text-[#64748b] text-sm">
          <b className="text-[#1e3a5f]">{cfg.examName}</b> · 모의고사 <b className="text-[#1e3a5f]">{cfg.freeRounds}회까지 무료</b>, {cfg.freeRounds + 1}회부터는 이용권으로 풀 수 있어요.
        </p>
      </div>

      {!hasSub && uniqueExams.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-[#fffbeb] to-[#fff7ed] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full mb-2">
                <Trophy className="h-3.5 w-3.5" /> 이용권 안내
              </div>
              <h2 className="text-lg font-black text-[#0f172a] mb-1.5">{cfg.freeRounds}회 무료로 풀어보고, 마음에 들면 무제한으로</h2>
              <p className="text-sm text-[#475569] leading-relaxed mb-2">
                {/* KBS는 서술형 AI 채점이 없고 급수제라, 열리는 기능 문구를 시험별로 다르게 안내 */}
                {cfg.hasManuscript ? (
                  <>이용권을 열면 <b className="text-[#1e3a5f]">모든 회차 무제한 풀이</b>, <b className="text-[#1e3a5f]">서술형 AI 채점·첨삭</b>, <b className="text-[#1e3a5f]">AI 예상 점수·합격 등급 판정</b>, <b className="text-[#1e3a5f]">영역별 약점 분석</b>까지 이어집니다.</>
                ) : (
                  <>이용권을 열면 <b className="text-[#1e3a5f]">모든 회차 무제한 풀이</b>, <b className="text-[#1e3a5f]">AI 예상 점수·등급 판정</b>, <b className="text-[#1e3a5f]">7개 영역별 약점 분석</b>, <b className="text-[#1e3a5f]">유형별 집중 연습</b>까지 이어집니다.</>
                )}
              </p>
              <p className="text-xs text-[#64748b]">
                5,500원 · 30일 무제한 · <b>1회 결제(자동결제 없음)</b> · 7일 내 미사용 전액 환불
              </p>
            </div>
            <Link
              href="/subscribe"
              className="btn-primary shrink-0 flex items-center justify-center gap-1.5 text-white font-bold py-3 px-6 rounded-xl text-sm"
            >
              이용권 보기 <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {uniqueExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-[#e2e8f0]">
          <div className="bg-[#f1f5f9] p-5 rounded-2xl mb-4">
            <FileQuestion className="h-10 w-10 text-[#64748b]" />
          </div>
          <p className="text-[#64748b] text-sm font-medium">아직 등록된 시험이 없습니다.</p>
          <p className="text-[#64748b] text-xs mt-1">관리자가 문제를 등록하면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {uniqueExams.map(({ year, round }) => {
            const key = `${year}-${round}`
            const prev = sessionMap.get(key)
            const pct = prev ? Math.round(((prev.score ?? 0) / (prev.total ?? 1)) * 100) : null
            const pass = pct !== null && pct >= 80
            const locked = isRoundLocked(round, hasSub, program)

            return (
              <div
                key={key}
                className="card-hover group bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] overflow-hidden"
              >
                {/* 상단 컬러 바 */}
                <div className={`h-1 w-full ${pass ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : prev ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-[#1e3a5f] to-[#2d5488]'}`} />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-[#1e3a5f] flex items-center justify-center shadow-md shadow-blue-500/20">
                          <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="font-bold text-[#0f172a] text-lg leading-tight">모의고사 {round}회</h2>
                          <div className="flex items-center gap-2 text-xs text-[#64748b] mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>{cfg.examMinutes}분</span>
                            <span>·</span>
                            <span>{countMap.get(`${year}-${round}`) ?? 0}문항</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {pct !== null && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${
                        pass ? 'bg-emerald-50 text-emerald-700' :
                        pct >= 60 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        <Trophy className="h-3.5 w-3.5" />
                        최고 {pct}점
                      </div>
                    )}
                  </div>

                  {prev && (
                    <Link
                      href={`/cbt/${formatExamId(program, year, round)}/result?session=${prev.id}`}
                      className="mb-4 bg-[#f8fafc] hover:bg-[#eef2f7] rounded-xl px-4 py-2.5 flex items-center justify-between transition-colors group"
                    >
                      <span className="text-xs text-[#64748b] group-hover:text-[#334155]">마지막 시도 · 결과 다시 보기</span>
                      <span className="text-xs font-semibold text-[#334155] flex items-center gap-1">
                        {prev.score}/{prev.total}점 · {new Date(prev.completed_at!).toLocaleDateString('ko-KR')}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  )}

                  <div className="flex items-center gap-2">
                    {locked ? (
                      <>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><Lock className="h-3 w-3" /> 이용권</span>
                        <Link
                          href="/subscribe"
                          className="flex-1 flex items-center justify-center gap-1.5 font-semibold py-2.5 rounded-xl text-sm border-2 border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                        >
                          이용권으로 풀기 <ChevronRight className="h-4 w-4" />
                        </Link>
                      </>
                    ) : (
                      <>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">무료</span>
                        <ExamResumeAction
                          href={`/cbt/${formatExamId(program, year, round)}`}
                          openSessionId={openSession.get(key) ?? null}
                          serverResumable={resumable.has(key)}
                          hasPrev={!!prev}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
