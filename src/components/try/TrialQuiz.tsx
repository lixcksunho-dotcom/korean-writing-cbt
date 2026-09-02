'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, ArrowRight, RotateCcw } from 'lucide-react'

export type TrialQuestion = {
  id: string
  number: number
  question: string
  passage: string | null
  options: string[]
  correct: string
  explanation: string | null
}

// 로그인 없이 풀어 보는 맛보기.
//
// 왜: /cbt와 /practice가 모두 로그인 필수라, 검색으로 들어온 사람이 문제를 한 번도 못 보고
// 돌아갔다. 유입의 맨 앞이 막혀 있으면 뒤의 어떤 기능도 쓰이지 않는다.
//
// 다 열지는 않는다 — 5문항만. 채점과 해설까지 보여 주고 거기서 '전 회차'로 잇는다.
// 서술형은 넣지 않는다. 채점에 유료 API가 들어가므로 로그인 없이 열면 그대로 비용이다.
export default function TrialQuiz({ questions }: { questions: TrialQuestion[] }) {
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [graded, setGraded] = useState(false)

  if (questions.length === 0) return null

  const answered = Object.keys(picked).length
  const correctCount = questions.filter(q => picked[q.id] === q.correct).length

  return (
    <div>
      {!graded && (
        <p className="mb-5 text-sm text-[#64748b]">
          {answered}/{questions.length}문항 선택 — 다 고르면 아래 버튼으로 채점하세요.
        </p>
      )}

      {graded && (
        <div className="mb-6 rounded-2xl border border-[#e2e8f0] bg-white p-5 text-center shadow-[0_4px_20px_rgba(15,31,61,0.06)]">
          <p className="text-sm text-[#64748b]">채점 결과</p>
          <p className="mt-1 text-3xl font-black text-[#0f1f3d]">
            {correctCount}
            <span className="text-lg font-bold text-[#94a3b8]"> / {questions.length}</span>
          </p>
          <p className="mt-2 text-sm text-[#475569]">
            {correctCount === questions.length
              ? '전부 맞히셨어요. 실제 시험은 선택형 30문항 + 서술형 9문항입니다.'
              : '틀린 문항의 해설을 아래에서 확인해 보세요.'}
          </p>
        </div>
      )}

      <ol className="space-y-5">
        {questions.map((q, i) => {
          const mine = picked[q.id]
          return (
            <li key={q.id} className="rounded-2xl border border-[#e2e8f0] bg-white p-5">
              <div className="mb-3 flex items-start gap-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0f1f3d] text-xs font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-[15px] font-semibold leading-relaxed text-[#0f172a]">{q.question}</p>
              </div>

              {q.passage && (
                <div className="mb-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-sm leading-relaxed whitespace-pre-wrap text-[#334155]">
                  {q.passage}
                </div>
              )}

              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const value = String(oi + 1)
                  const isMine = mine === value
                  const isRight = q.correct === value
                  // 채점 전에는 고른 것만 표시한다. 채점 뒤에는 정답과 내가 고른 것을 함께 보여 준다.
                  const tone = !graded
                    ? isMine ? 'border-[#1e3a5f] bg-[#f1f5f9]' : 'border-[#e2e8f0] bg-white hover:bg-[#f8fafc]'
                    : isRight ? 'border-emerald-300 bg-emerald-50'
                      : isMine ? 'border-red-300 bg-red-50'
                        : 'border-[#e2e8f0] bg-white'
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={graded}
                      aria-pressed={isMine}
                      onClick={() => setPicked(p => ({ ...p, [q.id]: value }))}
                      className={`flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm leading-relaxed transition-colors ${tone}`}
                    >
                      <span className="mt-px shrink-0 font-bold text-[#64748b]">{'①②③④⑤'[oi] ?? value}</span>
                      <span className="min-w-0 flex-1 text-[#334155]">{opt}</span>
                      {graded && isRight && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
                      {graded && isMine && !isRight && <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>

              {graded && q.explanation && (
                <div className="mt-3 rounded-xl bg-[#f8fafc] p-3.5 text-sm leading-relaxed text-[#475569]">
                  <b className="text-[#0f172a]">해설 </b>
                  {q.explanation}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {!graded ? (
        <button
          type="button"
          disabled={answered < questions.length}
          onClick={() => { setGraded(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] py-4 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {answered < questions.length ? `${questions.length - answered}문항 더 고르면 채점할 수 있어요` : '채점하기'}
        </button>
      ) : (
        <div className="mt-6 space-y-2.5">
          <Link
            href="/signup"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] py-4 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            전 회차 무료로 풀어보기 <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => { setPicked({}); setGraded(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white py-3 text-sm font-semibold text-[#475569] transition-colors hover:bg-[#f8fafc]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> 다시 풀기
          </button>
        </div>
      )}
    </div>
  )
}
