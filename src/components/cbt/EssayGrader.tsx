'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Sparkles, CheckCircle2, AlertCircle, Lock } from 'lucide-react'
import { gradeExamEssay, type EssayGrade } from '@/app/(main)/cbt/actions'

export default function EssayGrader({
  sessionId,
  questionId,
  points,
  initialGrade,
  hasSubscription,
}: {
  sessionId: string
  questionId: string
  points: number
  initialGrade: EssayGrade | null
  hasSubscription: boolean
}) {
  const [grade, setGrade] = useState<EssayGrade | null>(initialGrade)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleGrade() {
    setError('')
    startTransition(async () => {
      try {
        const result = await gradeExamEssay(sessionId, questionId)
        setGrade(result)
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        setError(msg === 'SUBSCRIPTION_REQUIRED' ? 'SUBSCRIPTION_REQUIRED' : '분석 중 오류가 발생했습니다.')
      }
    })
  }

  if (grade) {
    const pct = grade.maxScore > 0 ? Math.round((grade.score / grade.maxScore) * 100) : 0
    return (
      <div className="mt-3 bg-gradient-to-br from-[#f8fafc] to-blue-50/40 border border-blue-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-sm font-bold text-[#1e3a5f]">
            <Sparkles className="h-4 w-4 text-[#f59e0b]" />
            AI 분석 결과
          </span>
          <span className="text-sm font-black text-[#1e3a5f]">
            {grade.score} <span className="text-[#94a3b8] font-medium">/ {grade.maxScore}점</span>
            <span className="ml-1.5 text-xs text-emerald-600">({pct}%)</span>
          </span>
        </div>
        <p className="text-sm text-[#334155] leading-relaxed mb-3">{grade.feedback}</p>
        {grade.strengths?.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-semibold text-emerald-600 mb-1">잘한 점</p>
            <ul className="space-y-0.5">
              {grade.strengths.map((s, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-[#334155]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />{s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {grade.improvements?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-600 mb-1">보완할 점</p>
            <ul className="space-y-0.5">
              {grade.improvements.map((s, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-[#334155]">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />{s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  if (!hasSubscription) {
    return (
      <Link
        href="/subscribe"
        className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-[#f59e0b]/40 bg-amber-50/50 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
      >
        <Lock className="h-4 w-4" />
        구독하고 AI 분석 받기 ({points}점 만점)
      </Link>
    )
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleGrade}
        disabled={isPending}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#1e3a5f] hover:bg-[#2d5488] disabled:opacity-60 text-white text-sm font-bold transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        {isPending ? 'AI 분석 중...' : 'AI 분석 받기'}
      </button>
      {error && error !== 'SUBSCRIPTION_REQUIRED' && (
        <p className="text-xs text-red-500 text-center mt-2">{error}</p>
      )}
    </div>
  )
}
