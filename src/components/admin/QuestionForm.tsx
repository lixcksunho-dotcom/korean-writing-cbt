'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createQuestion, updateQuestion } from '@/app/admin/(protected)/questions/actions'

type Question = {
  id?: string
  year: number
  round: number
  number: number
  type: 'multiple' | 'short' | 'essay'
  passage: string
  question: string
  options: string[] | null
  correct_answer: string
  explanation: string
}

const DEFAULT: Question = {
  year: new Date().getFullYear(),
  round: 1,
  number: 1,
  type: 'multiple',
  passage: '',
  question: '',
  options: ['', '', '', '', ''],
  correct_answer: '',
  explanation: '',
}

export default function QuestionForm({ initial }: { initial?: Question }) {
  const q = initial ?? DEFAULT
  const [year, setYear] = useState(String(q.year))
  const [round, setRound] = useState(String(q.round))
  const [number, setNumber] = useState(String(q.number))
  const [type, setType] = useState<'multiple' | 'short' | 'essay'>(q.type)
  const [passage, setPassage] = useState(q.passage ?? '')
  const [question, setQuestion] = useState(q.question)
  const [options, setOptions] = useState<string[]>(q.options ?? ['', '', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState(q.correct_answer)
  const [explanation, setExplanation] = useState(q.explanation)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function setOption(i: number, val: string) {
    setOptions(prev => prev.map((o, idx) => idx === i ? val : o))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const data = {
      year: parseInt(year),
      round: parseInt(round),
      number: parseInt(number),
      type,
      passage: passage.trim() || null,
      question: question.trim(),
      options: type === 'multiple' ? options.map(o => o.trim()) : null,
      correct_answer: correctAnswer.trim(),
      explanation: explanation.trim(),
    }

    if (!data.question || !data.correct_answer) {
      setError('문제와 정답은 필수입니다.')
      return
    }
    if (type === 'multiple' && data.options?.some(o => !o)) {
      setError('객관식은 5개 선택지를 모두 입력해주세요.')
      return
    }
    if (type === 'essay' && !data.correct_answer) {
      setError('서술형은 모범 답안을 입력해주세요.')
      return
    }

    startTransition(async () => {
      try {
        if (q.id) {
          await updateQuestion(q.id, data)
        } else {
          await createQuestion(data)
        }
        router.push('/admin/questions')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '저장 실패')
      }
    })
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f] transition-colors'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 기본 정보 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>연도</label>
          <input type="number" value={year} onChange={e => setYear(e.target.value)} className={inputCls} required min={2000} max={2099} />
        </div>
        <div>
          <label className={labelCls}>회차</label>
          <input type="number" value={round} onChange={e => setRound(e.target.value)} className={inputCls} required min={1} />
        </div>
        <div>
          <label className={labelCls}>문제 번호</label>
          <input type="number" value={number} onChange={e => setNumber(e.target.value)} className={inputCls} required min={1} />
        </div>
      </div>

      {/* 지문 */}
      <div>
        <label className={labelCls}>지문 <span className="text-gray-600 font-normal">(선택 — 여러 문제가 공유하는 지문)</span></label>
        <textarea
          value={passage}
          onChange={e => setPassage(e.target.value)}
          className={`${inputCls} h-32 resize-none`}
          placeholder="공통 지문이 있는 경우 입력하세요"
        />
      </div>

      {/* 유형 */}
      <div>
        <label className={labelCls}>문제 유형</label>
        <div className="flex gap-3">
          {(['multiple', 'short', 'essay'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={[
                'flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors',
                type === t ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300',
              ].join(' ')}
            >
              {t === 'multiple' ? '객관식' : t === 'short' ? '단답형' : '서술형'}
            </button>
          ))}
        </div>
      </div>

      {/* 문제 */}
      <div>
        <label className={labelCls}>문제</label>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          className={`${inputCls} h-28 resize-none`}
          placeholder="문제를 입력하세요"
          required
        />
      </div>

      {/* 선택지 (객관식) */}
      {type === 'multiple' && (
        <div>
          <label className={labelCls}>선택지 (5개)</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-600 w-5 shrink-0">{'①②③④⑤'[i]}</span>
                <input
                  value={opt}
                  onChange={e => setOption(i, e.target.value)}
                  className={inputCls}
                  placeholder={`선택지 ${i + 1}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 정답 / 모범답안 */}
      <div>
        <label className={labelCls}>
          {type === 'essay' ? '모범 답안' : '정답'}
          <span className="ml-1 text-xs text-gray-600 font-normal">
            {type === 'multiple' ? '(1~5 숫자)' : type === 'essay' ? '' : '(단답형 정답 텍스트)'}
          </span>
        </label>
        {type === 'essay' ? (
          <textarea
            value={correctAnswer}
            onChange={e => setCorrectAnswer(e.target.value)}
            className={`${inputCls} h-32 resize-none`}
            placeholder="모범 답안을 입력하세요"
            required
          />
        ) : (
          <input
            value={correctAnswer}
            onChange={e => setCorrectAnswer(e.target.value)}
            className={inputCls}
            placeholder={type === 'multiple' ? '예: 3' : '정답을 입력하세요'}
            required
          />
        )}
      </div>

      {/* 해설 */}
      <div>
        <label className={labelCls}>해설 <span className="text-gray-600 font-normal">(선택)</span></label>
        <textarea
          value={explanation}
          onChange={e => setExplanation(e.target.value)}
          className={`${inputCls} h-24 resize-none`}
          placeholder="오답 해설을 입력하세요"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 bg-[#1e3a5f] hover:bg-[#2d5488] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {isPending ? '저장 중...' : q.id ? '수정 완료' : '문제 추가'}
        </button>
      </div>
    </form>
  )
}
