'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, ChevronLeft, FileText, ChevronDown, Sparkles, Lock, Loader2 } from 'lucide-react'
import EditableManuscript from '@/components/manuscript/EditableManuscript'
import { gradeEssayPractice } from '../actions'
import type { EssayGrade } from '@/app/(main)/cbt/actions'

export type PracticeEssayQuestion = {
  id: string
  number: number
  points: number
  question: string
  passage: string | null
  correct_answer: string
}

const COLS = 20

export default function PracticeEssay({
  questions,
  title,
  hasSubscription,
}: {
  questions: PracticeEssayQuestion[]
  title: string
  hasSubscription: boolean
}) {
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [grades, setGrades] = useState<Record<string, EssayGrade>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [passageOpen, setPassageOpen] = useState(true)
  const [showModel, setShowModel] = useState(false)
  const [isPending, startTransition] = useTransition()

  const q = questions[idx]
  const answer = answers[q.id] ?? ''
  const grade = grades[q.id]
  const charCount = Array.from(answer).filter(c => c !== '\n').length
  const isManuscript = (q.points ?? 0) >= 200 // 9번 보고서만 원고지, 1~8번은 줄 답안

  function go(n: number) {
    setIdx(n)
    setPassageOpen(true)
    setShowModel(false)
  }

  function grade_() {
    setErrors(e => ({ ...e, [q.id]: '' }))
    startTransition(async () => {
      try {
        const result = await gradeEssayPractice(q.id, answer)
        setGrades(g => ({ ...g, [q.id]: result }))
      } catch (err) {
        const msg = err instanceof Error ? err.message : '채점 중 오류가 발생했어요.'
        setErrors(e => ({ ...e, [q.id]: msg === 'SUBSCRIPTION_REQUIRED' ? '서술형 AI 분석은 구독 후 이용할 수 있어요.' : msg }))
      }
    })
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <Link href="/practice/essay" className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" /> {title}
        </Link>
        <span className="text-sm text-[#94a3b8]">서술형 {idx + 1} / {questions.length}</span>
      </div>

      {/* 번호 그리드 */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {questions.map((question, i) => (
            <button
              key={question.id}
              onClick={() => go(i)}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                i === idx ? 'bg-gradient-to-br from-amber-500 to-[#d97706] text-white'
                : grades[question.id] ? 'bg-emerald-100 text-emerald-700'
                : answers[question.id] ? 'bg-amber-50 text-amber-700'
                : 'bg-[#f1f5f9] text-[#64748b]'
              }`}
            >
              서술형 {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* 지문 */}
      {q.passage && (
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl mb-4 overflow-hidden">
          <button onClick={() => setPassageOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#f1f5f9] transition-colors">
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#1e3a5f]" /><span className="text-sm font-bold text-[#1e3a5f]">제시문 · 자료</span></div>
            <ChevronDown className={`h-4 w-4 text-[#94a3b8] transition-transform ${passageOpen ? 'rotate-180' : ''}`} />
          </button>
          {passageOpen && <div className="px-5 pb-5 pt-1 max-h-80 overflow-y-auto"><p className="text-sm text-[#334155] leading-relaxed whitespace-pre-wrap">{q.passage}</p></div>}
        </div>
      )}

      {/* 문제 + 작성 */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-6 md:p-7">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">서술형 {idx + 1}</span>
          <span className="text-xs text-[#94a3b8]">{q.points}점</span>
        </div>
        <p className="text-[#0f172a] font-medium leading-relaxed mb-6 whitespace-pre-wrap text-base">{q.question}</p>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#64748b]">{isManuscript ? `원고지 (${COLS}칸) — 칸에 바로 입력하세요` : '답안 작성'}</span>
          <span className="text-xs text-[#94a3b8] tabular-nums">{charCount}자</span>
        </div>
        {isManuscript ? (
          <EditableManuscript value={answer} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} cols={COLS} rows={42} cell={28} />
        ) : (
          <textarea
            value={answer}
            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
            placeholder="조건에 맞게 답안을 작성하세요. 기호(㉠, ㉡ 등)가 있으면 그대로 적어 구분하세요."
            className="h-40 w-full border-2 border-[#e2e8f0] rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-[#1e3a5f] transition-colors bg-[#f8fafc] focus:bg-white resize-none leading-relaxed font-mono"
            spellCheck={false}
          />
        )}

        {/* AI 채점 */}
        <div className="mt-4">
          {hasSubscription ? (
            <button
              onClick={grade_}
              disabled={isPending || !answer.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-[#d97706] text-white disabled:opacity-50"
            >
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> 분석 중...</> : <><Sparkles className="h-4 w-4" /> AI 분석받기</>}
            </button>
          ) : (
            <Link href="/subscribe" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-amber-300 text-amber-700 hover:bg-amber-50">
              <Lock className="h-4 w-4" /> 구독하고 AI 분석받기
            </Link>
          )}
          {errors[q.id] && <p className="text-xs text-red-500 mt-2">{errors[q.id]}</p>}
        </div>

        {/* 채점 결과 */}
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
          <button onClick={() => go(Math.min(questions.length - 1, idx + 1))} disabled={idx === questions.length - 1} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-30 transition-colors">다음 <ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  )
}
