'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Sparkles, CheckCircle2, AlertCircle, Lock } from 'lucide-react'
import { gradeExamEssay, type EssayGrade } from '@/app/(main)/cbt/actions'
import { useAiTrial } from '@/components/cbt/AiTrialContext'

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
  const trial = useAiTrial()

  // 비구독자라도 무료 체험(전체 1회, 결과화면 내 모든 서술형이 공유)이 남아 있으면 분석 가능
  const canUseTrial = !hasSubscription && trial.remaining > 0

  function handleGrade() {
    setError('')
    startTransition(async () => {
      try {
        const result = await gradeExamEssay(sessionId, questionId)
        setGrade(result)
        if (!hasSubscription) trial.spend() // 무료 체험 1회 소진 → 다른 문항도 잠금
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

  // 비구독자 + 무료 체험 소진 → 구독 유도
  if (!hasSubscription && !canUseTrial) {
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
        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl disabled:opacity-60 text-white text-sm font-bold transition-colors ${
          canUseTrial ? 'bg-gradient-to-r from-amber-500 to-[#d97706] hover:opacity-90' : 'bg-[#1e3a5f] hover:bg-[#2d5488]'
        }`}
      >
        <Sparkles className="h-4 w-4" />
        {isPending ? 'AI 분석 중...' : canUseTrial ? '무료로 1회 AI 분석 체험' : 'AI 분석 받기'}
      </button>
      {canUseTrial && (
        <p className="text-[11px] text-[#94a3b8] text-center mt-1.5">구독 없이 <span className="font-semibold text-amber-600">1회 무료</span>로 받아볼 수 있어요.</p>
      )}
      {error && error !== 'SUBSCRIPTION_REQUIRED' && (
        <p className="text-xs text-red-500 text-center mt-2">{error}</p>
      )}
    </div>
  )
}
