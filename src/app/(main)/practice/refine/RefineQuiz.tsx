'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, X, RotateCcw, ChevronRight, CircleDot } from 'lucide-react'

export type RefineItem = {
  category: string
  wrong: string
  correct: string
  note?: string
}

// 한 문항: 표기 하나를 보여주고 그것이 '바른 표현'인지 O/X 판단
type Quiz = {
  shown: string        // 화면에 보여줄 표기
  isCorrectForm: boolean // shown 이 바른(순화된) 표현이면 true → 정답 O
  item: RefineItem
}

const ROUND_SIZE = 20

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function RefineQuiz({ items }: { items: RefineItem[] }) {
  const categories = [...new Set(items.map(i => i.category))]
  const [cat, setCat] = useState<string>('전체')
  const [quiz, setQuiz] = useState<Quiz[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<(boolean | null)[]>([])

  function start() {
    const pool = cat === '전체' ? items : items.filter(i => i.category === cat)
    const picked = shuffle(pool).slice(0, ROUND_SIZE)
    const qs: Quiz[] = picked.map(item => {
      const isCorrectForm = Math.random() < 0.5
      return { shown: isCorrectForm ? item.correct : item.wrong, isCorrectForm, item }
    })
    setQuiz(qs)
    setIdx(0)
    setPicked(Array.from({ length: qs.length }, () => null))
  }

  // 설정 화면
  if (!quiz) {
    return (
      <div className="animate-fade-up max-w-xl">
        <Link href="/practice" className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f] mb-5">
          <ArrowLeft className="h-4 w-4" /> 연습 메뉴
        </Link>
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">순화어 O/X 퀴즈</h1>
        <p className="text-[#64748b] text-sm mb-6">표기를 보고 <b>바른 표현이면 O, 틀린 표현이면 X</b>를 고르세요. 틀린 표기에는 바른 순화어와 설명을 보여줘요.</p>

        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-6">
          <p className="text-sm font-semibold text-[#334155] mb-3">분야 선택</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {['전체', ...categories].map(c => {
              const count = c === '전체' ? items.length : items.filter(i => i.category === c).length
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    cat === c ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]' : 'border-[#e2e8f0] text-[#64748b] hover:border-[#94a3b8]'
                  }`}
                >
                  {c} <span className="text-xs text-[#94a3b8]">{count}</span>
                </button>
              )
            })}
          </div>
          <button onClick={start} className="w-full btn-primary text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
            <CircleDot className="h-4 w-4" /> 퀴즈 시작 (최대 {ROUND_SIZE}문항)
          </button>
        </div>
      </div>
    )
  }

  const q = quiz[idx]
  const myPick = picked[idx]
  const answered = myPick != null
  const correct = answered && myPick === q.isCorrectForm
  const solved = picked.filter(p => p != null).length
  const right = quiz.filter((qq, i) => picked[i] != null && picked[i] === qq.isCorrectForm).length
  const isLast = idx === quiz.length - 1
  const allDone = solved === quiz.length

  function answer(choice: boolean) {
    if (picked[idx] != null) return
    setPicked(prev => prev.map((p, i) => (i === idx ? choice : p)))
  }

  return (
    <div className="animate-fade-up max-w-xl">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setQuiz(null)} className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" /> 분야 다시 선택
        </button>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[#94a3b8]">{idx + 1} / {quiz.length}</span>
          <span className="font-semibold text-emerald-600">정답 {right}<span className="text-[#cbd5e1]">/{solved}</span></span>
        </div>
      </div>

      <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden mb-5">
        <div className="h-full bg-gradient-to-r from-[#1e3a5f] to-[#3d6aa0] rounded-full transition-all duration-300" style={{ width: `${(solved / quiz.length) * 100}%` }} />
      </div>

      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-6 md:p-8">
        <p className="text-center text-sm text-[#64748b] mb-4">이 표기는 바른 표현일까요?</p>
        <p className="text-center text-3xl font-black text-[#0f172a] mb-7 break-keep">{q.shown}</p>

        {!answered ? (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => answer(true)} className="flex items-center justify-center gap-2 py-5 rounded-2xl border-2 border-emerald-200 text-emerald-600 font-black text-xl hover:bg-emerald-50 transition-colors">
              <Check className="h-6 w-6" /> O
            </button>
            <button onClick={() => answer(false)} className="flex items-center justify-center gap-2 py-5 rounded-2xl border-2 border-red-200 text-red-500 font-black text-xl hover:bg-red-50 transition-colors">
              <X className="h-6 w-6" /> X
            </button>
          </div>
        ) : (
          <div className={`rounded-2xl p-5 ${correct ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
            <p className={`text-base font-bold mb-2 ${correct ? 'text-emerald-700' : 'text-red-500'}`}>
              {correct ? '정답이에요!' : '아쉬워요.'}
            </p>
            <div className="bg-white/70 rounded-xl px-4 py-3 text-sm text-[#334155]">
              바른 표기: <span className="text-emerald-700 font-bold">{q.item.correct}</span>
            </div>
            {q.item.note && <p className="text-xs text-[#64748b] mt-2">💡 {q.item.note}</p>}
          </div>
        )}

        <div className="flex items-center justify-between mt-7 pt-6 border-t border-[#f1f5f9]">
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-30 transition-colors">이전</button>
          {!isLast ? (
            <button onClick={() => setIdx(i => i + 1)} disabled={!answered} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-40">다음 <ChevronRight className="h-4 w-4" /></button>
          ) : (
            <button onClick={start} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#1e3a5f] border-2 border-[#1e3a5f] hover:bg-[#1e3a5f]/5"><RotateCcw className="h-4 w-4" /> 새 문제</button>
          )}
        </div>
      </div>

      {allDone && (
        <div className="mt-5 bg-white rounded-2xl border border-emerald-200 p-5 text-center">
          <p className="text-sm text-[#64748b]">완료! <span className="font-bold text-[#0f172a]">{quiz.length}</span>문항 중 <span className="font-bold text-emerald-600">{right}</span>문항 정답 ({Math.round((right / quiz.length) * 100)}%)</p>
        </div>
      )}
    </div>
  )
}
