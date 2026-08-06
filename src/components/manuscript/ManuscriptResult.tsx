'use client'

import { RotateCcw, Trophy, CheckCircle2, AlertCircle } from 'lucide-react'
import type { GradeResult } from '@/app/(main)/manuscript/actions'

const CATEGORIES = [
  { key: 'manuscriptRules', label: '원고지 사용법', color: 'bg-purple-500' },
  { key: 'examFit', label: '실용글쓰기 답안 기준 부합', color: 'bg-emerald-500' },
  { key: 'spellingGrammar', label: '맞춤법·어법', color: 'bg-blue-500' },
] as const

export default function ManuscriptResult({
  result,
  topic,
  onReset,
}: {
  result: GradeResult
  topic: string
  onReset: () => void
}) {
  const pass = result.totalScore >= 80

  return (
    <div>
      {/* 점수 카드 */}
      <div className={`rounded-2xl p-8 mb-6 text-center text-white ${pass ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-[#1e3a5f] to-[#2d5488]'}`}>
        <Trophy className="h-10 w-10 mx-auto mb-3 opacity-90" />
        <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-1">{result.totalScore}점</div>
        <div className="text-white/80 mb-2">/ 100점</div>
        <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${pass ? 'bg-white/20' : 'bg-white/10'}`}>
          {pass ? '합격권' : '불합격'}
        </div>
        <div className="mt-3 text-sm text-white/60 truncate px-4">{topic}</div>
      </div>

      {/* 항목별 점수 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 className="font-bold text-gray-900 mb-4">항목별 점수</h2>
        <div className="space-y-4">
          {CATEGORIES.map(({ key, label, color }) => {
            const item = result.breakdown[key]
            const pct = Math.round((item.score / item.max) * 100)
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="text-sm font-bold text-gray-900">{item.score} / {item.max}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{item.feedback}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 종합 평가 */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
          <h2 className="font-bold text-blue-900">종합 평가</h2>
        </div>
        <p className="text-sm text-blue-800 leading-relaxed">{result.overallComment}</p>
      </div>

      {/* 교정 목록 */}
      {result.corrections.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <h2 className="font-bold text-gray-900">교정 사항 ({result.corrections.length}건)</h2>
          </div>
          <div className="space-y-3">
            {result.corrections.map((c, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex flex-wrap gap-x-2 gap-y-1 mb-1">
                  <span className="text-red-600 line-through font-medium">{c.original}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-600 font-medium">{c.correction}</span>
                </div>
                <p className="text-xs text-gray-500">{c.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 다시 작성 버튼 */}
      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-[#1e3a5f] text-[#1e3a5f] font-semibold text-sm hover:bg-[#1e3a5f]/5 transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
        다시 작성하기
      </button>
    </div>
  )
}
