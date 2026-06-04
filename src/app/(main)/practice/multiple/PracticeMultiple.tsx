'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, FileText, ChevronDown, RotateCcw } from 'lucide-react'

export type PracticeQuestion = {
  id: string
  year: number
  round: number
  number: number
  question: string
  options: string[]
  passage: string | null
  correct_answer: string
  explanation: string | null
}

const CIRCLE = ['①', '②', '③', '④', '⑤']

export default function PracticeMultiple({
  questions,
  title,
}: {
  questions: PracticeQuestion[]
  title: string
}) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [passageOpen, setPassageOpen] = useState(true)

  const q = questions[idx]
  const chosen = picked[q.id]
  const revealed = chosen != null
  const correct = revealed && chosen === q.correct_answer
  const solved = Object.keys(picked).length
  const right = questions.filter(x => picked[x.id] === x.correct_answer).length

  function choose(val: string) {
    if (picked[q.id] != null) return // 이미 답한 문제는 고정
    setPicked(prev => ({ ...prev, [q.id]: val }))
  }

  function go(n: number) {
    setIdx(n)
    setPassageOpen(true)
  }

  function reset() {
    setPicked({})
    go(0)
  }

  const isLast = idx === questions.length - 1
  const allDone = solved === questions.length

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <Link href="/practice/multiple" className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" /> {title}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[#94a3b8]">{idx + 1} / {questions.length}</span>
          <span className="font-semibold text-emerald-600">정답 {right}<span className="text-[#cbd5e1]">/{solved}</span></span>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden mb-5">
        <div className="h-full bg-gradient-to-r from-[#1e3a5f] to-[#3d6aa0] rounded-full transition-all duration-300" style={{ width: `${(solved / questions.length) * 100}%` }} />
      </div>

      {/* 지문 */}
      {q.passage && (
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl mb-4 overflow-hidden">
          <button onClick={() => setPassageOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#f1f5f9] transition-colors">
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#1e3a5f]" /><span className="text-sm font-bold text-[#1e3a5f]">지 문</span></div>
            <ChevronDown className={`h-4 w-4 text-[#94a3b8] transition-transform ${passageOpen ? 'rotate-180' : ''}`} />
          </button>
          {passageOpen && <div className="px-5 pb-5 pt-1 max-h-72 overflow-y-auto"><p className="text-sm text-[#334155] leading-relaxed whitespace-pre-wrap">{q.passage}</p></div>}
        </div>
      )}

      {/* 문제 카드 */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-6 md:p-7">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm font-bold text-[#1e3a5f] bg-[#1e3a5f]/8 px-3.5 py-1.5 rounded-full">{q.year}-{q.round} · {q.number}번</span>
        </div>
        <p className="text-[#0f172a] font-medium leading-relaxed mb-7 whitespace-pre-wrap text-base">{q.question}</p>

        <div className="space-y-2.5">
          {q.options.map((option, i) => {
            const val = String(i + 1)
            const isPicked = chosen === val
            const isAnswer = q.correct_answer === val
            let cls = 'border-[#e2e8f0] text-[#334155] hover:border-[#94a3b8] hover:bg-[#f8fafc]'
            if (revealed) {
              if (isAnswer) cls = 'border-emerald-400 bg-emerald-50 text-emerald-800'
              else if (isPicked) cls = 'border-red-300 bg-red-50 text-red-600'
              else cls = 'border-[#e2e8f0] text-[#94a3b8]'
            }
            return (
              <button
                key={i}
                onClick={() => choose(val)}
                disabled={revealed}
                className={`w-full text-left px-5 py-3.5 rounded-xl border-2 transition-all text-sm font-medium flex items-center gap-2.5 ${cls} ${revealed ? 'cursor-default' : ''}`}
              >
                <span className="font-bold">{CIRCLE[i]}</span>
                <span className="flex-1">{option}</span>
                {revealed && isAnswer && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                {revealed && isPicked && !isAnswer && <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* 즉시 채점 결과 + 해설 */}
        {revealed && (
          <div className={`mt-5 rounded-xl px-4 py-3.5 ${correct ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
            <p className={`text-sm font-bold flex items-center gap-1.5 ${correct ? 'text-emerald-700' : 'text-red-500'}`}>
              {correct ? <><CheckCircle2 className="h-4 w-4" /> 정답이에요!</> : <><XCircle className="h-4 w-4" /> 아쉬워요. 정답은 {CIRCLE[parseInt(q.correct_answer) - 1]} 입니다.</>}
            </p>
            {q.explanation && <p className="text-xs text-[#475569] leading-relaxed mt-2 whitespace-pre-wrap">💡 {q.explanation}</p>}
          </div>
        )}

        {/* 이동 */}
        <div className="flex items-center justify-between mt-7 pt-6 border-t border-[#f1f5f9]">
          <button onClick={() => go(Math.max(0, idx - 1))} disabled={idx === 0} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-30 transition-colors">이전</button>
          {!isLast ? (
            <button onClick={() => go(idx + 1)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white">다음 <ChevronRight className="h-4 w-4" /></button>
          ) : (
            <button onClick={reset} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#1e3a5f] border-2 border-[#1e3a5f] hover:bg-[#1e3a5f]/5"><RotateCcw className="h-4 w-4" /> 다시 풀기</button>
          )}
        </div>
      </div>

      {allDone && (
        <div className="mt-5 bg-white rounded-2xl border border-emerald-200 p-5 text-center">
          <p className="text-sm text-[#64748b]">연습 완료! 총 <span className="font-bold text-[#0f172a]">{questions.length}</span>문항 중 <span className="font-bold text-emerald-600">{right}</span>문항 정답 ({Math.round((right / questions.length) * 100)}%)</p>
        </div>
      )}
    </div>
  )
}
