'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, ChevronLeft, ChevronRight, Send, AlertCircle, CheckCircle2, FileText } from 'lucide-react'
import { createSession, submitSession } from '@/app/(main)/cbt/actions'
import ManuscriptGrid from '@/components/manuscript/ManuscriptGrid'

export type Question = {
  id: string
  number: number
  type: 'multiple' | 'short' | 'essay'
  points?: number
  question: string
  options: string[] | null
  passage?: string | null
}

const ESSAY_COLS = 20

const CIRCLE_NUMS = ['①', '②', '③', '④', '⑤']
const EXAM_MINUTES = 120 // 실제 시험 120분

// 서술형 중 '원고지(작문지)'로 푸는 문항 = 보고서(장문). 배점이 큰 문항만 원고지 사용.
// (실제 OMR: 서술형 1~8은 줄 답안칸, 9번 보고서만 대형 원고지)
const MANUSCRIPT_MIN_POINTS = 200
const isManuscriptQ = (q: Question) => q.type === 'essay' && (q.points ?? 0) >= MANUSCRIPT_MIN_POINTS

export default function ExamPlayer({
  questions,
  examYear,
  examRound,
}: {
  questions: Question[]
  examYear: number
  examRound: number
}) {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [timeLeft, setTimeLeft] = useState(EXAM_MINUTES * 60)
  const [isPending, startTransition] = useTransition()

  const sessionCreated = useRef(false)
  const sessionIdRef = useRef<string | null>(null)
  const answersRef = useRef(answers)
  useEffect(() => { answersRef.current = answers }, [answers])

  useEffect(() => {
    if (sessionCreated.current) return
    sessionCreated.current = true
    createSession(examYear, examRound).then(({ sessionId: id }) => {
      setSessionId(id)
      sessionIdRef.current = id
    })
  }, [examYear, examRound])

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(timer)
  }, [])

  function handleAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  function handleSubmit() {
    const sid = sessionIdRef.current
    if (!sid) return
    startTransition(async () => {
      await submitSession(sid, answersRef.current)
      router.push(`/cbt/${examYear}-${examRound}/result?session=${sid}`)
    })
    setShowConfirm(false)
  }

  const q = questions[currentIdx]
  // 서술형 표시 번호(1~9) — DB 내부 번호(31~39)와 무관하게 등장 순서로 매김
  const essayList = questions.filter(x => x.type === 'essay')
  const essayNo = (id: string) => essayList.findIndex(x => x.id === id) + 1
  const answeredCount = Object.keys(answers).length
  const progress = (answeredCount / questions.length) * 100
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timerWarning = timeLeft < 600 // 10분 미만
  const multipleCount = questions.filter(q => q.type === 'multiple').length
  const essayCount = questions.filter(q => q.type === 'essay').length

  return (
    <div className="animate-fade-up">
      {/* 시험 헤더 */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] px-5 py-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-bold text-[#0f172a]">{examYear}년 {examRound}회</span>
            <span className="text-[#94a3b8] text-xs ml-2">
              객관식 {multipleCount}문 · 서술형 {essayCount}문
            </span>
            <span className="text-[#94a3b8] text-sm ml-3">{answeredCount}/{questions.length}문항 완료</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 font-mono font-bold text-sm px-3 py-1.5 rounded-xl ${
              timerWarning ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-[#f1f5f9] text-[#334155]'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="btn-primary flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-sm font-semibold"
            >
              <Send className="h-3.5 w-3.5" />
              제출하기
            </button>
          </div>
        </div>
        <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#1e3a5f] to-[#3d6aa0] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-5">
        {/* 문제 번호 사이드바 */}
        <div className="hidden lg:block w-44 shrink-0">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-4 sticky top-24">
            <p className="text-xs font-semibold text-[#94a3b8] mb-3 uppercase tracking-wide">문제 목록</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((question, idx) => (
                <button
                  key={question.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={[
                    'h-8 w-8 rounded-lg text-xs font-bold transition-all relative',
                    idx === currentIdx
                      ? 'bg-gradient-to-br from-[#1e3a5f] to-[#2d5488] text-white shadow-md'
                      : answers[question.id]
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]',
                  ].join(' ')}
                  title={question.type === 'essay' ? '서술형' : ''}
                >
                  {question.type === 'essay' ? `서${essayNo(question.id)}` : question.number}
                  {question.type === 'essay' && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-[#94a3b8]">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gradient-to-br from-[#1e3a5f] to-[#2d5488]" />현재</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-100" />완료</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#f1f5f9]" />미완료</div>
              <div className="flex items-center gap-1.5">
                <div className="relative w-3 h-3 rounded bg-[#f1f5f9]"><span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full" /></div>
                서술형
              </div>
            </div>
          </div>
        </div>

        {/* 문제 영역 */}
        <div className="flex-1 min-w-0">
          {/* 모바일 번호 그리드 */}
          <div className="lg:hidden bg-white rounded-2xl border border-[#e2e8f0] p-3 mb-4">
            <div className="flex flex-wrap gap-1.5">
              {questions.map((question, idx) => (
                <button
                  key={question.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={[
                    'h-8 w-8 rounded-lg text-xs font-bold transition-all relative',
                    idx === currentIdx ? 'bg-gradient-to-br from-[#1e3a5f] to-[#2d5488] text-white'
                      : answers[question.id] ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-[#f1f5f9] text-[#64748b]',
                  ].join(' ')}
                >
                  {question.type === 'essay' ? `서${essayNo(question.id)}` : question.number}
                  {question.type === 'essay' && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 지문/자료 — 실제 시험지처럼 항상 펼쳐진 박스 */}
          {q.passage && (
            <div className="bg-white border-2 border-[#1e3a5f]/20 rounded-xl mb-4">
              <div className="px-5 py-2.5 border-b border-[#1e3a5f]/10 flex items-center gap-2 bg-[#f8fafc] rounded-t-xl">
                <FileText className="h-4 w-4 text-[#1e3a5f]" />
                <span className="text-sm font-bold text-[#1e3a5f]">[지문 · 자료]</span>
              </div>
              <div className="px-6 py-5 max-h-[30rem] overflow-y-auto">
                <p className="text-[15px] text-[#1f2937] leading-[1.9] whitespace-pre-wrap">{q.passage}</p>
              </div>
            </div>
          )}

          {/* 문제 카드 */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-6 md:p-7">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1e3a5f] bg-[#1e3a5f]/8 px-3.5 py-1.5 rounded-full">
                  {q.type === 'essay' ? `서술형 ${essayNo(q.id)}번` : `${q.number}번`}
                </span>
                {q.type === 'essay' && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                    {isManuscriptQ(q) ? '원고지 작성' : '서술형'}
                  </span>
                )}
                {q.type === 'short' && (
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">
                    단답형
                  </span>
                )}
              </div>
              <span className="text-xs text-[#94a3b8] font-medium">{currentIdx + 1} / {questions.length}</span>
            </div>

            <p className="text-[#0f172a] font-medium leading-relaxed mb-8 whitespace-pre-wrap text-base">
              {q.question}
            </p>

            {/* 객관식 */}
            {q.type === 'multiple' && q.options && (
              <div className="space-y-2.5">
                {q.options.map((option, i) => {
                  const val = String(i + 1)
                  const selected = answers[q.id] === val
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(q.id, val)}
                      className={[
                        'w-full text-left px-5 py-3.5 rounded-xl border-2 transition-all text-sm font-medium',
                        selected
                          ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f] shadow-sm'
                          : 'border-[#e2e8f0] hover:border-[#94a3b8] text-[#334155] hover:bg-[#f8fafc]',
                      ].join(' ')}
                    >
                      <span className={`mr-2.5 font-bold ${selected ? 'text-[#1e3a5f]' : 'text-[#94a3b8]'}`}>
                        {CIRCLE_NUMS[i]}
                      </span>
                      {option}
                    </button>
                  )
                })}
              </div>
            )}

            {/* 단답형 */}
            {q.type === 'short' && (
              <input
                type="text"
                value={answers[q.id] ?? ''}
                onChange={e => handleAnswer(q.id, e.target.value)}
                placeholder="답을 입력하세요"
                className="w-full border-2 border-[#e2e8f0] rounded-xl px-5 py-3.5 text-sm focus:outline-none focus:border-[#1e3a5f] transition-colors bg-[#f8fafc] focus:bg-white"
              />
            )}

            {/* 서술형 — 9번(보고서)만 원고지, 1~8번은 줄 답안 */}
            {q.type === 'essay' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#64748b]">
                    {isManuscriptQ(q) ? `원고지 (${ESSAY_COLS}칸)` : '답안 작성'}
                  </span>
                  <span className="text-xs text-[#94a3b8] tabular-nums">
                    {Array.from(answers[q.id] ?? '').filter(c => c !== '\n').length}자
                  </span>
                </div>
                {isManuscriptQ(q) && (
                  <ManuscriptGrid
                    text={answers[q.id] ?? ''}
                    cols={ESSAY_COLS}
                    rows={52}
                    cell={30}
                  />
                )}
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={e => handleAnswer(q.id, e.target.value)}
                  placeholder={isManuscriptQ(q)
                    ? '답안을 작성하세요. 입력하면 위 원고지에 실시간 반영됩니다. (Enter = 줄바꿈)'
                    : '조건에 맞게 답안을 작성하세요. 기호(㉠, ㉡ 등)가 있으면 그대로 적어 구분하세요.'}
                  className={`w-full border-2 border-[#e2e8f0] rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-[#1e3a5f] transition-colors bg-[#f8fafc] focus:bg-white resize-none leading-relaxed font-mono ${isManuscriptQ(q) ? 'h-56' : 'h-32'}`}
                  spellCheck={false}
                />
                <p className="text-xs text-[#94a3b8]">
                  ※ 제출 후 결과 화면에서 <span className="font-semibold text-[#f59e0b]">AI 채점</span>(항목별 점수·첨삭) 또는 모범 답안 비교가 제공됩니다.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#f1f5f9]">
              <button
                onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </button>
              {answers[q.id] && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {q.type === 'essay' ? '답안 작성됨' : '답변 완료'}
                </span>
              )}
              <button
                onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
                disabled={currentIdx === questions.length - 1}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 제출 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl border border-[#e2e8f0]">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172a]">시험을 제출할까요?</h3>
            </div>
            <div className="bg-[#f8fafc] rounded-xl p-4 mb-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748b]">객관식 완료</span>
                <span className="font-bold text-[#0f172a]">
                  {questions.filter(q => q.type === 'multiple' && answers[q.id]).length} / {multipleCount}
                </span>
              </div>
              {essayCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748b]">서술형 완료</span>
                  <span className="font-bold text-[#0f172a]">
                    {questions.filter(q => q.type === 'essay' && answers[q.id]).length} / {essayCount}
                  </span>
                </div>
              )}
              {answeredCount < questions.length && (
                <p className="text-amber-600 text-xs font-medium pt-1">
                  ⚠ {questions.length - answeredCount}문항이 미완료 상태입니다.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 rounded-xl border-2 border-[#e2e8f0] text-[#64748b] font-semibold text-sm hover:bg-[#f8fafc] transition-colors">
                취소
              </button>
              <button onClick={handleSubmit} disabled={isPending || !sessionId} className="flex-1 py-3 rounded-xl btn-primary text-white font-bold text-sm disabled:opacity-50">
                {isPending ? '제출 중...' : '제출하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
