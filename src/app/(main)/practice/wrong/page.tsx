import { createClient } from '@/lib/supabase/server'
import { redirectToLogin } from '@/lib/loginRedirect'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, BookOpen, ChevronRight } from 'lucide-react'
import PracticeMultiple, { type PracticeQuestion } from '../multiple/PracticeMultiple'
import { getActiveProgram } from '@/lib/programContext'
import { questionBank } from '@/lib/questionBank'
import { latestWrongNoteAnswers } from '@/lib/wrongNoteRetake'

export const dynamic = 'force-dynamic'

// 오답 재시험 — 내가 '지금도 틀리는' 객관식만 모아 다시 푼다.
export default async function WrongPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>
}) {
  const { round: roundParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirectToLogin('/practice/wrong')

  // 현재 보고 있는 시험의 오답만 — 두 시험 문항이 한 묶음에 섞이지 않게.
  const program = await getActiveProgram()

  const sessions: { id: string; completed_at: string }[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('quiz_sessions').select('id, completed_at')
      .eq('user_id', user.id).eq('program', program).not('completed_at', 'is', null)
      .order('id').range(offset, offset + 499)
    if (error) throw new Error('오답 기록을 불러오지 못했어요.')
    sessions.push(...(data ?? []))
    if ((data ?? []).length < 500) break
  }

  let wrongIds: string[] = []
  if ((sessions ?? []).length > 0) {
    const ans: { session_id: string; question_id: string; is_correct: boolean | null }[] = []
    for (let batch = 0; batch < sessions.length; batch += 100) {
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('quiz_answers')
          .select('session_id, question_id, is_correct')
          .in('session_id', sessions.slice(batch, batch + 100).map(s => s.id))
          .not('is_correct', 'is', null).order('id').range(offset, offset + 499)
        if (error) throw new Error('오답 기록을 불러오지 못했어요.')
        ans.push(...(data ?? []))
        if ((data ?? []).length < 500) break
      }
    }
    const latest = latestWrongNoteAnswers(sessions ?? [], ans ?? [])
    wrongIds = [...latest.entries()].filter(([, ok]) => !ok).map(([id]) => id)
  }

  const { data: rows } = wrongIds.length
    ? await questionBank()
        .from('questions')
        .select('id, year, round, number, question, options, passage, correct_answer, explanation')
        .in('id', wrongIds)
        .eq('program', program)
        .eq('type', 'multiple')
        .order('round')
        .order('number')
    : { data: [] as PracticeQuestion[] }

  const questions = (rows ?? []) as unknown as PracticeQuestion[]

  if (questions.length === 0) {
    // 빈 화면이 두 가지인데 하나로 뭉뚱그리면 안 된다. 아직 한 번도 안 푼 사람에게
    // 초록 체크와 함께 '틀리는 게 없어요!'라고 하면 칭찬으로 읽힌다 — 맞힌 게 아니라
    // 시작을 안 한 것이다. 게다가 나갈 링크가 없어서 뒤로가기 말고는 길이 없었다.
    const neverSolved = (sessions ?? []).length === 0
    return (
      <div className="animate-fade-up max-w-2xl mx-auto">
        <Link href="/insights" className="inline-flex items-center gap-1.5 py-3 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
          <ArrowLeft className="h-4 w-4" /> 학습 리포트
        </Link>
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center bg-white rounded-2xl border border-[#e2e8f0]">
          <div className={`p-5 rounded-2xl mb-4 ${neverSolved ? 'bg-[#f1f5f9]' : 'bg-emerald-50'}`}>
            {neverSolved
              ? <BookOpen className="h-10 w-10 text-[#1e3a5f]" />
              : <CheckCircle2 className="h-10 w-10 text-emerald-500" />}
          </div>
          <p className="text-[#334155] text-sm font-semibold">
            {neverSolved ? '아직 푼 문제가 없어요' : '지금 틀리는 객관식이 없어요!'}
          </p>
          <p className="text-[#64748b] text-xs mt-1 leading-relaxed">
            {neverSolved
              ? '모의고사를 한 회차 풀면 틀린 문항이 여기 자동으로 모여요.'
              : '모의고사를 더 풀면 약점이 자동으로 모입니다.'}
          </p>
          <Link
            href="/cbt"
            className="mt-6 inline-flex items-center justify-center gap-1.5 btn-primary text-white font-semibold px-6 py-3.5 rounded-xl text-sm"
          >
            {neverSolved ? '첫 모의고사 풀기' : '모의고사 더 풀기'}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  // 회차별로 나눠 볼 수 있게 한다.
  //
  // 왜 필요한가: 오답노트는 1회차부터 지금까지 '지금도 틀리는' 문항을 한 줄로 모은다.
  // 회차가 쌓이면 "5회 오답만 보고 싶은데 1회부터 넘겨야 한다"가 된다(2026-09-10 문의).
  const byRound = new Map<number, number>()
  for (const q of questions) byRound.set(Number(q.round), (byRound.get(Number(q.round)) ?? 0) + 1)
  const rounds = [...byRound.keys()].sort((a, b) => a - b)
  const picked = roundParam && rounds.includes(Number(roundParam)) ? Number(roundParam) : null
  const shown = picked == null ? questions : questions.filter(q => Number(q.round) === picked)

  return (
    <div>
      {rounds.length > 1 && (
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/practice/wrong"
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                picked == null
                  ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                  : 'border-[#e2e8f0] bg-white text-[#475569] hover:border-[#cbd5e1]'
              }`}
            >
              전체 {questions.length}
            </Link>
            {rounds.map(r => (
              <Link
                key={r}
                href={`/practice/wrong?round=${r}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                  picked === r
                    ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                    : 'border-[#e2e8f0] bg-white text-[#475569] hover:border-[#cbd5e1]'
                }`}
              >
                {r}회 {byRound.get(r)}
              </Link>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#64748b]">
            다시 풀어 맞힌 기록이 저장되면, 목록을 새로 열 때 빠져요.
          </p>
        </div>
      )}
      <PracticeMultiple
        questions={shown}
        persistWrongRetakes
        title={picked == null ? `오답 다시 풀기 (${shown.length}문항)` : `${picked}회 오답 (${shown.length}문항)`}
      />
    </div>
  )
}
