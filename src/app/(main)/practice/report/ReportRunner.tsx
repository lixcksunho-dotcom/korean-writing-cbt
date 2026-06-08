'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Sparkles, Lock, Loader2, CheckCircle2 } from 'lucide-react'
import EditableManuscript from '@/components/manuscript/EditableManuscript'
import PassageView from '@/components/cbt/PassageView'
import CopyGuard from '@/components/cbt/CopyGuard'
import { gradeEssayPractice } from '../actions'
import { parseCharLimit, manuscriptRows } from '@/lib/charLimit'
import type { EssayGrade } from '@/app/(main)/cbt/actions'

export type ReportQuestion = {
  id: string
  points: number
  question: string
  passage: string | null
  correct_answer: string
  examLabel: string
}

const COLS = 20
const MIN_PER_REPORT = 40 // 보고서 1편당 권장 시간(분)

export default function ReportRunner({
  questions,
  hasSubscription,
  aiTrialRemaining = 0,
}: {
  questions: ReportQuestion[]
  hasSubscription: boolean
  aiTrialRemaining?: number
}) {
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [grades, setGrades] = useState<Record<string, EssayGrade>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showModel, setShowModel] = useState(false)
  const [timeLeft, setTimeLeft] = useState(questions.length * MIN_PER_REPORT * 60)
  const [trialUsedLocal, setTrialUsedLocal] = useState(0)
  const [isPending, startTransition] = useTransition()

  const trialLeft = Math.max(0, aiTrialRemaining - trialUsedLocal)
  const canUseAi = hasSubscription || trialLeft > 0

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const q = questions[idx]
  const answer = answers[q.id] ?? ''
  const grade = grades[q.id]
  const charCount = Array.from(answer).filter(c => c !== '\n').length
  const charLimit = parseCharLimit(q.question)
  const overLimit = charLimit != null && charCount > charLimit
  const mRows = manuscriptRows(charLimit, COLS, 44)
  const min = Math.floor(timeLeft / 60)
  const sec = timeLeft % 60
  const timeUp = timeLeft === 0
  const warning = timeLeft > 0 && timeLeft < 300

  function go(n: number) {
    setIdx(n)
    setShowModel(false)
  }

  function grade_() {
    setErrors(e => ({ ...e, [q.id]: '' }))
    startTransition(async () => {
      try {
        const result = await gradeEssayPractice(q.id, answer)
        setGrades(g => ({ ...g, [q.id]: result }))
        if (!hasSubscription) setTrialUsedLocal(n => n + 1)
      } catch (err) {
        const msg = err instanceof Error ? err.message : '채점 중 오류가 발생했어요.'
        setErrors(e => ({ ...e, [q.id]: msg === 'SUBSCRIPTION_REQUIRED' ? '서술형 AI 분석은 구독 후 이용할 수 있어요.' : msg }))
      }
    })
  }

  return (
    <div className="animate-fade-up">
      {/* 헤더 + 타이머 */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/practice" className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" /> 연습 메뉴
        </Link>
        <div className={`flex items-center gap-1.5 font-mono font-bold text-sm px-3 py-1.5 rounded-xl ${
          timeUp ? 'bg-red-100 text-red-600' : warning ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-[#f1f5f9] text-[#334155]'
        }`}>
          <Clock className="h-3.5 w-3.5" />
          {timeUp ? '시간 종료' : `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`}
        </div>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">서술형 9번 보고서 실전</h1>
        <p className="text-[#64748b] text-sm">실제 시험의 보고서 문항을 시간 안에 이어서 작성해 보세요. 권장 시간은 보고서 1편당 약 {MIN_PER_REPORT}분이에요.</p>
      </div>

      {/* 보고서 번호 네비 */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {questions.map((question, i) => (
            <button
              key={question.id}
              onClick={() => go(i)}
              className={`px-3 h-9 rounded-lg text-xs font-bold transition-all ${
                i === idx ? 'bg-gradient-to-br from-[#1e3a5f] to-[#2d5488] text-white'
                  : grades[question.id] ? 'bg-emerald-100 text-emerald-700'
                  : answers[question.id] ? 'bg-amber-50 text-amber-700'
                  : 'bg-[#f1f5f9] text-[#64748b]'
              }`}
            >
              보고서 {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* 지문/자료 */}
      {q.passage && (
        <div className="bg-white border-2 border-[#1e3a5f]/20 rounded-xl mb-4">
          <div className="px-4 sm:px-5 py-2.5 border-b border-[#1e3a5f]/10 flex items-center justify-between bg-[#f8fafc] rounded-t-xl">
            <span className="text-sm font-bold text-[#1e3a5f]">[지문 · 자료]</span>
            <span className="text-xs text-[#94a3b8]">{q.examLabel}</span>
          </div>
          <div className="px-4 sm:px-5 py-4 max-h-[34vh] overflow-y-auto">
            <PassageView text={q.passage} />
          </div>
        </div>
      )}

      {/* 문제 + 원고지 */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-5 sm:p-7">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">보고서 {idx + 1}</span>
          <span className="text-xs text-[#94a3b8]">{q.points}점 · {q.examLabel}</span>
        </div>
        <p className="text-[#0f172a] font-medium leading-relaxed mb-5 whitespace-pre-wrap text-base">{q.question}</p>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#64748b]">
            원고지 ({COLS}칸) — 칸에 바로 입력하세요
            {charLimit != null && <span className="ml-1 text-amber-600">· 제한 {charLimit}자</span>}
          </span>
          <span className={`text-xs tabular-nums font-semibold ${overLimit ? 'text-red-500' : 'text-[#94a3b8]'}`}>
            {charCount}{charLimit != null ? ` / ${charLimit}` : ''}자{overLimit ? ' 초과' : ''}
          </span>
        </div>
        <EditableManuscript
          value={answer}
          onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}
          cols={COLS}
          rows={mRows}
          cell={28}
          maxHeightVh={55}
        />

        {/* AI 분석 */}
        <div className="mt-4">
          {canUseAi ? (
            <>
              <button onClick={grade_} disabled={isPending || !answer.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-[#d97706] text-white disabled:opacity-50">
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> 분석 중...</> : <><Sparkles className="h-4 w-4" /> {hasSubscription ? 'AI 분석받기' : '무료로 AI 분석 체험'}</>}
              </button>
              {!hasSubscription && <p className="text-xs text-[#94a3b8] mt-1.5">구독 없이 <span className="font-semibold text-amber-600">무료 {trialLeft}회</span> 더 받아볼 수 있어요.</p>}
            </>
          ) : (
            <Link href="/subscribe" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-amber-300 text-amber-700 hover:bg-amber-50">
              <Lock className="h-4 w-4" /> {(aiTrialRemaining > 0 || trialUsedLocal > 0) ? '무료 체험 모두 사용 · 구독하고 무제한' : '구독하고 AI 분석받기'}
            </Link>
          )}
          {errors[q.id] && <p className="text-xs text-red-500 mt-2">{errors[q.id]}</p>}
        </div>

        {grade && (
          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-5">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-black text-[#d97706]">{grade.score}</span>
              <span className="text-sm text-[#94a3b8]">/ {grade.maxScore}점</span>
            </div>
            <p className="text-sm text-[#334155] leading-relaxed mb-3">{grade.feedback}</p>
            {grade.strengths?.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-bold text-emerald-700 mb-1">잘한 점</p>
                <ul className="text-xs text-[#475569] space-y-0.5 list-disc list-inside">{grade.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {grade.improvements?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-500 mb-1">보완할 점</p>
                <ul className="text-xs text-[#475569] space-y-0.5 list-disc list-inside">{grade.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        {/* 모범답안 */}
        <div className="mt-4">
          <button onClick={() => setShowModel(v => !v)} className="text-xs font-semibold text-amber-700 hover:underline">
            {showModel ? '모범 답안 숨기기' : '모범 답안 보기'}
          </button>
          {showModel && (
            <div className="mt-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4">
              <p className="text-sm text-[#334155] whitespace-pre-wrap leading-relaxed">{q.correct_answer}</p>
            </div>
          )}
        </div>

        {/* 이동 */}
        <div className="flex items-center justify-between mt-7 pt-6 border-t border-[#f1f5f9]">
          <button onClick={() => go(Math.max(0, idx - 1))} disabled={idx === 0} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-30 transition-colors"><ChevronLeft className="h-4 w-4" /> 이전</button>
          {answer.trim() && <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> 작성됨</span>}
          <button onClick={() => go(Math.min(questions.length - 1, idx + 1))} disabled={idx === questions.length - 1} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-30 transition-colors">다음 <ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <CopyGuard />
    </div>
  )
}
