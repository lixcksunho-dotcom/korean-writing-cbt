'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Sparkles, CheckCircle2, AlertCircle, Lock } from 'lucide-react'
import { gradeExamEssay, type EssayGrade } from '@/app/(main)/cbt/actions'
import { useAiTrial } from '@/components/cbt/AiTrialContext'
import { gradingErrorText, isGradingError } from '@/lib/aiGradingMessage'
import AiEstimateNotice from '@/components/grading/AiEstimateNotice'

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
        // 실패는 값으로 온다(운영 빌드가 throw 메시지를 지우기 때문).
        if (isGradingError(result)) {
          setError(gradingErrorText(result, '분석 중 오류가 발생했습니다.'))
          return
        }
        setGrade(result)
        if (!hasSubscription) trial.spend() // 무료 체험 1회 소진 → 다른 문항도 잠금
      } catch {
        setError('분석 중 오류가 발생했습니다.')
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
            {grade.score} <span className="text-[#64748b] font-medium">/ {grade.maxScore}점</span>
            <span className="ml-1.5 text-xs text-emerald-700">({pct}%)</span>
          </span>
        </div>
        <p className="text-sm text-[#334155] leading-relaxed mb-3">{grade.feedback}</p>
        {grade.strengths?.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-semibold text-emerald-700 mb-1">잘한 점</p>
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
            <p className="text-xs font-semibold text-amber-700 mb-1">보완할 점</p>
            <ul className="space-y-0.5">
              {grade.improvements.map((s, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-[#334155]">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />{s}
                </li>
              ))}
            </ul>
          </div>
        )}
        <AiEstimateNotice className="mt-3 pt-2 border-t border-blue-100" />

        {/* 첨삭 직후 업셀 — aha 직후가 전환 최적 타이밍 */}
        {!hasSubscription && (
          <Link href="/subscribe" className="mt-3 flex items-center justify-between gap-2 bg-white/70 border border-amber-200 rounded-lg px-3 py-2 hover:bg-amber-50 transition-colors">
            <span className="text-xs text-amber-800">
              {trial.remaining > 0
                ? <>무료 체험 <b>{trial.remaining}회</b> 남음 · 9문항 전체를 무제한으로</>
                : <>무료 체험을 모두 썼어요 · <b>30일 무제한</b>으로 계속하기</>}
            </span>
            <span className="text-xs font-black text-[#1e3a5f] whitespace-nowrap">5,500원 →</span>
          </Link>
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
        // 금색 위 흰 글자는 명암비 2.15라 읽히지 않는다. 주 CTA(.btn-gold)와 같은 기준으로
        // 금색은 살리고 글자를 진하게 둔다(8.31/5.60). 남색 버튼일 때는 흰 글자가 맞다.
        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl disabled:opacity-60 text-sm font-bold transition-colors ${
          canUseTrial
            ? 'bg-gradient-to-r from-amber-500 to-[#d97706] text-[#0f172a] hover:opacity-90'
            : 'bg-[#1e3a5f] text-white hover:bg-[#2d5488]'
        }`}
      >
        <Sparkles className="h-4 w-4" />
        {isPending ? 'AI 분석 중...' : canUseTrial ? '무료로 AI 분석 체험' : 'AI 분석 받기'}
      </button>
      {canUseTrial && (
        <p className="text-xs text-[#64748b] text-center mt-1.5">구독 없이 <span className="font-semibold text-amber-700">무료 {trial.remaining}회</span> 더 받아볼 수 있어요.</p>
      )}
      {error && error !== 'SUBSCRIPTION_REQUIRED' && (
        <p className="text-xs text-red-600 text-center mt-2">{error}</p>
      )}
    </div>
  )
}
