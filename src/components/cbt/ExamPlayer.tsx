'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock, ChevronLeft, ChevronRight, ChevronDown, Send, AlertCircle, CheckCircle2, FileText, Save, Lock } from 'lucide-react'
import { submitSession, saveExamProgress } from '@/app/(main)/cbt/actions'
import EditableManuscript, { type EditableManuscriptHandle } from '@/components/manuscript/EditableManuscript'
import { parseCharLimit, manuscriptRows, clampToCharLimit } from '@/lib/charLimit'
import { extractCircledLabels, insertAtTextareaCursor } from '@/lib/circledSymbols'
import SymbolPalette from '@/components/cbt/SymbolPalette'
import PassageView from '@/components/cbt/PassageView'
import MarkedText from '@/components/cbt/MarkedText'
import CopyGuard from '@/components/cbt/CopyGuard'
import { getProgram, type ProgramId } from '@/lib/programs'

export type Question = {
  id: string
  number: number
  type: 'multiple' | 'short' | 'essay'
  points?: number
  question: string
  options: string[] | null
  passage?: string | null
  audio_url?: string | null
}

const CIRCLE_NUMS = ['①', '②', '③', '④', '⑤']
// 시험시간·원고지 칸수·원고지 판정 기준은 시험별(programs.ts)로 다르므로 컴포넌트 내부에서 계산.

export default function ExamPlayer({
  questions,
  examYear,
  examRound,
  examProgram,
  sessionId,
  initialAnswers,
  initialTimeLeft,
  hasSubscription,
}: {
  questions: Question[]
  examYear: number
  examRound: number
  examProgram?: ProgramId
  sessionId: string
  initialAnswers?: Record<string, string>
  initialTimeLeft?: number | null
  hasSubscription: boolean
}) {
  const router = useRouter()
  // 시험별 설정 (실글=1000점·120분·원고지20칸, KBS=990점·90분 등)
  const cfg = getProgram(examProgram)
  const ESSAY_COLS = cfg.essayColumns
  const EXAM_MINUTES = cfg.examMinutes
  const isManuscriptQ = (q: Question) => q.type === 'essay' && (q.points ?? 0) >= cfg.manuscriptMinPoints
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {})
  const [showConfirm, setShowConfirm] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft ?? EXAM_MINUTES * 60)
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)

  const answersRef = useRef(answers)
  useEffect(() => { answersRef.current = answers }, [answers])
  // 서술형 원문자(㉠㉡…) 삽입용 입력 ref (한 번에 한 문항만 렌더되므로 단일 ref로 충분)
  const essayTaRef = useRef<HTMLTextAreaElement>(null)
  const essayEmRef = useRef<EditableManuscriptHandle>(null)
  const timeLeftRef = useRef(timeLeft)
  useEffect(() => { timeLeftRef.current = timeLeft }, [timeLeft])

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(timer)
  }, [])

  // 시간 종료 시 자동 제출 — 실제 CBT처럼 제한 시간을 강제한다(한 번만).
  const autoSubmittedRef = useRef(false)
  useEffect(() => {
    if (timeLeft > 0 || autoSubmittedRef.current) return
    autoSubmittedRef.current = true
    startTransition(async () => {
      await submitSession(sessionId, answersRef.current)
      router.push(`/cbt/${examYear}-${examRound}/result?session=${sessionId}`)
    })
  }, [timeLeft, sessionId, examYear, examRound, router])

  function handleAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  function handleSubmit() {
    startTransition(async () => {
      await submitSession(sessionId, answersRef.current)
      router.push(`/cbt/${examYear}-${examRound}/result?session=${sessionId}`)
    })
    setShowConfirm(false)
  }

  // 저장하고 나가기 (유료 전용) — 답안·남은시간 저장 후 시험 목록으로
  function handleSaveExit() {
    setSaving(true)
    startTransition(async () => {
      try {
        await saveExamProgress(sessionId, answersRef.current, timeLeftRef.current)
        router.push('/cbt')
      } catch {
        setSaving(false)
      }
    })
  }

  const q = questions[currentIdx]
  const qCharLimit = parseCharLimit(q.question)
  const qCharCount = Array.from(answers[q.id] ?? '').filter(c => c !== '\n').length
  const qOverLimit = qCharLimit != null && qCharCount > qCharLimit
  const qRows = manuscriptRows(qCharLimit, ESSAY_COLS)
  // 서술형 답안 저장 — 문제 제한 글자수로 하드 캡(쓸 수 있는 최대 = 문제 제한, 무조건 일치)
  const setEssayAnswer = (v: string) => handleAnswer(q.id, clampToCharLimit(v, qCharLimit))
  // 문제/지문에 등장한 원문자 라벨(㉠㉡㉢…) — 있으면 답안칸 위에 삽입 팔레트 표시
  const qLabels = q.type === 'essay' ? extractCircledLabels(q.question, q.passage) : []
  // 서술형 + 지문이 있으면 좌우 2단(지문 왼쪽·답안 오른쪽). 그 외엔 기존 세로 배치.
  const sideBySide = q.type === 'essay' && !!q.passage
  const insertSymbol = (sym: string) => {
    if (isManuscriptQ(q)) {
      essayEmRef.current?.insertAtCursor(sym)
    } else {
      insertAtTextareaCursor(essayTaRef.current, answers[q.id] ?? '', setEssayAnswer, sym)
    }
  }
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
      {/* 남은 시간·제출은 시험 내내 손에 닿아야 하므로 상단 고정 */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-2 pb-1 bg-[#f8fafc]/95 backdrop-blur sm:static sm:mx-0 sm:p-0 sm:bg-transparent sm:backdrop-blur-none">
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] px-4 sm:px-5 py-3 sm:py-4 mb-3 sm:mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
          <div className="min-w-0">
            <span className="font-bold text-[#0f172a]">모의고사 {examRound}회</span>
            <span className="text-[#94a3b8] text-xs ml-2">
              객관식 {multipleCount}문 · 서술형 {essayCount}문
            </span>
            <span className="text-[#94a3b8] text-sm ml-2 whitespace-nowrap">{answeredCount}/{questions.length} 완료</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className={`flex items-center gap-1.5 font-mono font-bold text-sm px-3 py-1.5 rounded-xl ${
              timerWarning ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-[#f1f5f9] text-[#334155]'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            {hasSubscription ? (
              <button
                onClick={handleSaveExit}
                disabled={saving || isPending}
                title="답안을 저장하고 나중에 이어서 풀 수 있어요"
                className="flex items-center gap-1.5 text-[#1e3a5f] bg-[#1e3a5f]/8 hover:bg-[#1e3a5f]/15 px-3 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{saving ? '저장 중...' : '저장하고 나가기'}</span>
              </button>
            ) : (
              <Link
                href="/subscribe"
                title="저장하고 나가기는 구독 회원 전용이에요"
                className="flex items-center gap-1.5 text-[#94a3b8] bg-[#f1f5f9] hover:bg-[#e2e8f0] px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">저장하고 나가기</span>
              </Link>
            )}
            <button
              onClick={() => setShowConfirm(true)}
              className="btn-primary flex shrink-0 items-center gap-1.5 text-white px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ml-auto sm:ml-0"
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
                    'h-9 w-9 rounded-lg text-xs font-bold transition-all relative',
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
          {/* 모바일 번호 그리드 — 100문항이면 첫 문제가 화면 밖으로 밀려나므로 기본은 접어 둔다 */}
          <div className="lg:hidden bg-white rounded-2xl border border-[#e2e8f0] p-3 mb-4">
            <button
              type="button"
              onClick={() => setShowGrid(v => !v)}
              aria-expanded={showGrid}
              className="flex w-full items-center justify-between text-xs font-bold text-[#1e3a5f]"
            >
              <span>문제 목록 {answeredCount}/{questions.length}</span>
              <span className="flex items-center gap-1 text-[#94a3b8] font-semibold">
                {showGrid ? '접기' : '펼치기'}
                <ChevronDown className={`h-4 w-4 transition-transform ${showGrid ? 'rotate-180' : ''}`} />
              </span>
            </button>
            <div className={`${showGrid ? 'flex' : 'hidden'} flex-wrap gap-1.5 mt-3`}>
              {questions.map((question, idx) => (
                <button
                  key={question.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={[
                    'h-9 w-9 rounded-lg text-xs font-bold transition-all relative',
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

          {/* 좌우 2단 래퍼(서술형+지문) — lg 이상에서 지문 왼쪽·답안 오른쪽, 모바일은 세로 */}
          <div className={sideBySide ? 'grid lg:grid-cols-2 gap-4 items-start' : ''}>
          {/* 지문/자료 — 실제 시험지처럼 항상 펼쳐진 박스 */}
          {q.passage && (
            <div className={`bg-white border-2 border-[#1e3a5f]/20 rounded-xl mb-4 ${sideBySide ? 'lg:mb-0 lg:sticky lg:top-24 lg:self-start' : ''}`}>
              <div className="px-5 py-2.5 border-b border-[#1e3a5f]/10 flex items-center gap-2 bg-[#f8fafc] rounded-t-xl">
                <FileText className="h-4 w-4 text-[#1e3a5f]" />
                <span className="text-sm font-bold text-[#1e3a5f]">[지문 · 자료]</span>
              </div>
              <div className={`px-4 sm:px-5 py-4 overflow-y-auto ${sideBySide ? 'max-h-[30rem] lg:max-h-[calc(100vh-9rem)]' : 'max-h-[30rem]'}`}>
                <PassageView text={q.passage} />
              </div>
            </div>
          )}

          {/* 문제 카드 */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-6 md:p-7 min-w-0">
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
              <MarkedText text={q.question} />
            </p>

            {/* 듣기 오디오 (audio_url이 있는 문항) */}
            {q.audio_url && (
              <div className="mb-8 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2.5 text-xs font-bold text-[#1e3a5f]">
                  <span className="whitespace-nowrap">🎧 듣기</span>
                  <span className="text-[#94a3b8] font-medium">음성을 듣고 답하세요 (여러 번 들을 수 있어요)</span>
                </div>
                <audio controls preload="none" src={q.audio_url} className="w-full">
                  브라우저가 오디오 재생을 지원하지 않습니다.
                </audio>
              </div>
            )}

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
                      <MarkedText text={option} />
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
                    {isManuscriptQ(q) ? `원고지 (${ESSAY_COLS}칸) — 칸에 바로 입력하세요` : '답안 작성'}
                    {qCharLimit != null && <span className="ml-1 text-amber-600">· 제한 {qCharLimit}자</span>}
                  </span>
                  <span className={`text-xs tabular-nums font-semibold ${qOverLimit ? 'text-red-500' : 'text-[#94a3b8]'}`}>
                    {qCharCount}{qCharLimit != null ? ` / ${qCharLimit}` : ''}자{qOverLimit ? ' 초과' : ''}
                  </span>
                </div>
                {qLabels.length > 0 && <SymbolPalette symbols={qLabels} onInsert={insertSymbol} />}
                {isManuscriptQ(q) ? (
                  <EditableManuscript
                    ref={essayEmRef}
                    value={answers[q.id] ?? ''}
                    onChange={setEssayAnswer}
                    cols={ESSAY_COLS}
                    rows={qRows}
                    cell={28}
                    maxHeightVh={55}
                  />
                ) : (
                  <textarea
                    ref={essayTaRef}
                    value={answers[q.id] ?? ''}
                    onChange={e => setEssayAnswer(e.target.value)}
                    placeholder="조건에 맞게 답안을 작성하세요. 기호(㉠, ㉡ 등)는 위의 '기호 삽입' 버튼으로 넣을 수 있어요."
                    className="w-full border-2 border-[#e2e8f0] rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-[#1e3a5f] transition-colors bg-[#f8fafc] focus:bg-white resize-none leading-relaxed font-mono h-32"
                    spellCheck={false}
                  />
                )}
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
              <button onClick={handleSubmit} disabled={isPending} className="flex-1 py-3 rounded-xl btn-primary text-white font-bold text-sm disabled:opacity-50">
                {isPending ? '제출 중...' : '제출하기'}
              </button>
            </div>
          </div>
        </div>
      )}
      <CopyGuard />
    </div>
  )
}
