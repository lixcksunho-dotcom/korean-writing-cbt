'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, ChevronLeft, FileText, ChevronDown, Sparkles, Lock, Loader2, Save, Check } from 'lucide-react'
import EditableManuscript, { type EditableManuscriptHandle } from '@/components/manuscript/EditableManuscript'
import PassageView from '@/components/cbt/PassageView'
import CopyGuard from '@/components/cbt/CopyGuard'
import SymbolPalette from '@/components/cbt/SymbolPalette'
import { gradeEssayPractice, savePracticeProgress } from '../actions'
import { parseCharLimit, manuscriptRows, clampToCharLimit } from '@/lib/charLimit'
import { extractCircledLabels, insertAtTextareaCursor } from '@/lib/circledSymbols'
import type { EssayGrade } from '@/app/(main)/cbt/actions'
import { readDraftRaw, parseDraft, saveDraft, clearDraft } from '@/lib/examDraft'
import { gradingErrorText, isGradingError, SUBSCRIPTION_REQUIRED } from '@/lib/aiGradingMessage'

// localStorage는 구독할 게 없다 — 마운트 시점 값만 필요하다.
const noSubscribe = () => () => {}

export type PracticeEssayQuestion = {
  id: string
  number: number
  points: number
  question: string
  passage: string | null
  correct_answer: string
}

const COLS = 20

export default function PracticeEssay({
  questions,
  title,
  hasSubscription,
  aiTrialRemaining = 0,
  backHref = '/practice/essay',
  saveKey,
  initialAnswers,
}: {
  questions: PracticeEssayQuestion[]
  title: string
  hasSubscription: boolean
  aiTrialRemaining?: number
  backHref?: string
  saveKey?: { year: number; round: number }   // 있으면 '저장하고 나가기' 활성화
  initialAnswers?: Record<string, string>
}) {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {})
  const [grades, setGrades] = useState<Record<string, EssayGrade>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [passageOpen, setPassageOpen] = useState(true)
  const [showModel, setShowModel] = useState(false)
  const [trialUsedLocal, setTrialUsedLocal] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const resumed = !!initialAnswers && Object.keys(initialAnswers).length > 0
  // 서술형 원문자(㉠㉡…) 삽입용 입력 ref (한 번에 한 문항만 렌더)
  const essayTaRef = useRef<HTMLTextAreaElement>(null)
  const essayEmRef = useRef<EditableManuscriptHandle>(null)

  // 구독자거나, 비구독자라도 무료 체험이 남아있으면 AI 분석 가능
  const trialLeft = Math.max(0, aiTrialRemaining - trialUsedLocal)
  const canUseAi = hasSubscription || trialLeft > 0

  // ── 작성 중 답안 사고 복구 ─────────────────────────────────────────────
  // '저장하고 나가기'는 유료 전용이라 무료 회원은 원고지 답안을 쓰다 탭이 닫히면 잃는다.
  // 브라우저에 임시 보관해 두었다가 되돌아오면 알려 준다(모의고사와 같은 방식).
  const draftKey = saveKey ? `practice-${saveKey.year}-${saveKey.round}` : `practice-${questions[0]?.id ?? 'x'}`
  const rawDraft = useSyncExternalStore(noSubscribe, () => readDraftRaw(draftKey), () => null)
  const draft = useMemo(() => parseDraft(rawDraft), [rawDraft])
  const [draftDismissed, setDraftDismissed] = useState(false)
  const answeredCount = Object.keys(answers).length
  // 서버에 저장해 둔 답안(유료)을 이미 불러왔다면 그쪽이 우선이다.
  const showDraftBanner = !!draft && !draftDismissed && !resumed && answeredCount === 0

  const answersRef = useRef(answers)
  useEffect(() => { answersRef.current = answers }, [answers])

  useEffect(() => {
    if (answeredCount === 0) return
    // 연습은 시간 제한이 없어 마감 시각이 없다.
    const id = setTimeout(() => saveDraft(draftKey, answersRef.current, null), 800)
    return () => clearTimeout(id)
  }, [answers, answeredCount, draftKey])

  useEffect(() => {
    const flush = () => {
      if (Object.keys(answersRef.current).length > 0) saveDraft(draftKey, answersRef.current, null)
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [draftKey])

  function restoreDraft() {
    if (!draft) return
    setAnswers(draft.answers)
    setDraftDismissed(true)
  }

  function discardDraft() {
    clearDraft(draftKey)
    setDraftDismissed(true)
  }

  function saveAndExit() {
    if (!saveKey) return
    setSaveError('')
    setSaving(true)
    startTransition(async () => {
      try {
        await savePracticeProgress(saveKey.year, saveKey.round, answers)
        router.push(backHref)
      } catch (err) {
        const msg = err instanceof Error ? err.message : '저장 중 오류가 발생했어요.'
        setSaveError(msg === 'SUBSCRIPTION_REQUIRED' ? '저장하고 나가기는 구독 회원만 이용할 수 있어요.' : msg)
        setSaving(false)
      }
    })
  }

  const q = questions[idx]
  const answer = answers[q.id] ?? ''
  const grade = grades[q.id]
  const charCount = Array.from(answer).filter(c => c !== '\n').length
  const isManuscript = (q.points ?? 0) >= 200 // 9번 보고서만 원고지, 1~8번은 줄 답안
  const charLimit = parseCharLimit(q.question) // 문항별 제한 글자수(없으면 null)
  const overLimit = charLimit != null && charCount > charLimit
  const mRows = manuscriptRows(charLimit, COLS)
  // 서술형 답안 저장 — 문제 제한 글자수로 하드 캡(쓸 수 있는 최대 = 문제 제한, 무조건 일치)
  const setEssayAnswer = (v: string) => setAnswers(a => ({ ...a, [q.id]: clampToCharLimit(v, charLimit) }))
  // 원문자 라벨(㉠㉡㉢…) 삽입 팔레트
  const qLabels = extractCircledLabels(q.question, q.passage)
  // 지문이 있으면 좌우 2단(지문 왼쪽·답안 오른쪽). 모의고사 ExamPlayer와 동일 방식.
  const sideBySide = !!q.passage
  const insertSymbol = (sym: string) => {
    if (isManuscript) {
      essayEmRef.current?.insertAtCursor(sym)
    } else {
      insertAtTextareaCursor(essayTaRef.current, answer, setEssayAnswer, sym)
    }
  }

  function go(n: number) {
    setIdx(n)
    setPassageOpen(true)
    setShowModel(false)
  }

  function grade_() {
    setErrors(e => ({ ...e, [q.id]: '' }))
    startTransition(async () => {
      try {
        const result = await gradeEssayPractice(q.id, answer)
        // 실패는 값으로 온다(운영 빌드가 throw 메시지를 지우기 때문).
        if (isGradingError(result)) {
          const msg = gradingErrorText(result, '채점 중 오류가 발생했어요.')
          setErrors(e => ({ ...e, [q.id]: msg === SUBSCRIPTION_REQUIRED ? '서술형 AI 분석은 구독 후 이용할 수 있어요.' : msg }))
          return
        }
        setGrades(g => ({ ...g, [q.id]: result }))
        if (!hasSubscription) setTrialUsedLocal(n => n + 1) // 무료 체험 1회 소진
      } catch {
        setErrors(e => ({ ...e, [q.id]: '채점 중 오류가 발생했어요.' }))
      }
    })
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-5 gap-2">
        <Link href={backHref} className="inline-flex items-center gap-1.5 py-3 text-sm text-[#64748b] hover:text-[#1e3a5f] min-w-0">
          <ArrowLeft className="h-4 w-4 shrink-0" /> <span className="truncate">{title}</span>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          {saveKey && (
            hasSubscription ? (
              <button
                onClick={saveAndExit}
                disabled={saving || isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1e3a5f] text-white hover:bg-[#2d5488] disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} 저장하고 나가기
              </button>
            ) : (
              // 무료 회원: 비활성(잠금) — 구독해야 사용 가능. 클릭 시 구독 안내로 이동.
              <Link
                href="/subscribe"
                title="저장하고 나가기는 구독 회원 전용이에요"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] cursor-not-allowed hover:text-amber-700 hover:border-amber-200"
              >
                <Lock className="h-3.5 w-3.5" /> 저장하고 나가기 <span className="text-xs font-bold text-amber-500">유료</span>
              </Link>
            )
          )}
          <span className="text-sm text-[#64748b] whitespace-nowrap">서술형 {idx + 1} / {questions.length}</span>
        </div>
      </div>

      {resumed && (
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5">
          <Check className="h-4 w-4" /> 저장해 둔 답안을 불러왔어요. 이어서 작성하세요.
        </div>
      )}

      {showDraftBanner && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-gradient-to-br from-[#fffbeb] to-[#fff7ed] px-4 py-3">
          <p className="text-sm font-bold text-[#0f172a]">
            작성하던 답안 {Object.keys(draft!.answers).length}문항이 남아 있어요
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#2d5488]"
            >
              불러오기
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-semibold text-[#64748b] transition-colors hover:bg-[#f8fafc]"
            >
              새로 시작
            </button>
          </div>
        </div>
      )}
      {saveError && <p className="mb-3 text-xs text-red-600">{saveError}</p>}

      {/* 번호 그리드 */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {questions.map((question, i) => (
            <button
              key={question.id}
              onClick={() => go(i)}
              className={`h-9 px-3.5 rounded-lg text-xs font-bold transition-all ${
                i === idx ? 'bg-gradient-to-br from-amber-500 to-[#d97706] text-[#0f172a]'
                : grades[question.id] ? 'bg-emerald-100 text-emerald-700'
                : answers[question.id] ? 'bg-amber-50 text-amber-700'
                : 'bg-[#f1f5f9] text-[#475569]'
              }`}
            >
              서술형 {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* 좌우 2단 래퍼(지문) — lg↑ 지문 왼쪽·답안 오른쪽, 모바일 세로 */}
      <div className={sideBySide ? 'grid lg:grid-cols-2 gap-4 items-start' : ''}>
      {/* 지문 */}
      {q.passage && (
        <div className={`bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl mb-4 overflow-hidden ${sideBySide ? 'lg:mb-0 lg:sticky lg:top-24 lg:self-start' : ''}`}>
          <button onClick={() => setPassageOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#f1f5f9] transition-colors">
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#1e3a5f]" /><span className="text-sm font-bold text-[#1e3a5f]">제시문 · 자료</span></div>
            <ChevronDown className={`h-4 w-4 text-[#64748b] transition-transform ${passageOpen ? 'rotate-180' : ''}`} />
          </button>
          {passageOpen && <div className={`px-4 sm:px-5 pb-5 pt-2 overflow-y-auto ${sideBySide ? 'max-h-96 lg:max-h-[calc(100vh-9rem)]' : 'max-h-96'}`}><PassageView text={q.passage} /></div>}
        </div>
      )}

      {/* 문제 + 작성 */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-6 md:p-7 min-w-0">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">서술형 {idx + 1}</span>
          <span className="text-xs text-[#64748b]">{q.points}점</span>
        </div>
        <p className="text-[#0f172a] font-medium leading-relaxed mb-6 whitespace-pre-wrap text-base">{q.question}</p>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#64748b]">
            {isManuscript ? `원고지 (${COLS}칸) — 칸에 바로 입력하세요` : '답안 작성'}
            {charLimit != null && <span className="ml-1 text-amber-700">· 제한 {charLimit}자</span>}
          </span>
          <span className={`text-xs tabular-nums font-semibold ${overLimit ? 'text-red-600' : 'text-[#64748b]'}`}>
            {charCount}{charLimit != null ? ` / ${charLimit}` : ''}자{overLimit ? ' 초과' : ''}
          </span>
        </div>
        {qLabels.length > 0 && (
          <div className="mb-2">
            <SymbolPalette symbols={qLabels} onInsert={insertSymbol} />
          </div>
        )}
        {isManuscript ? (
          <EditableManuscript ref={essayEmRef} value={answer} onChange={setEssayAnswer} cols={COLS} rows={mRows} cell={28} maxHeightVh={55} />
        ) : (
          <textarea
            aria-label="서술형 답안"
            ref={essayTaRef}
            value={answer}
            onChange={e => setEssayAnswer(e.target.value)}
            placeholder="조건에 맞게 답안을 작성하세요. 기호(㉠, ㉡ 등)는 위의 '기호 삽입' 버튼으로 넣을 수 있어요."
            className="h-40 w-full border-2 border-[#e2e8f0] rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-[#1e3a5f] transition-colors bg-[#f8fafc] focus:bg-white resize-none leading-relaxed font-mono"
            spellCheck={false}
          />
        )}

        {/* AI 채점 */}
        <div className="mt-4">
          {canUseAi ? (
            <>
              <button
                onClick={grade_}
                disabled={isPending || !answer.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-[#d97706] text-[#0f172a] disabled:opacity-50"
              >
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> 분석 중...</> : <><Sparkles className="h-4 w-4" /> {hasSubscription ? 'AI 분석받기' : '무료로 AI 분석 체험'}</>}
              </button>
              {!hasSubscription && (
                <p className="text-xs text-[#64748b] mt-1.5">구독 없이 <span className="font-semibold text-amber-700">무료 {trialLeft}회</span> 더 AI 첨삭을 받아볼 수 있어요.</p>
              )}
            </>
          ) : (
            <Link href="/subscribe" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-amber-300 text-amber-700 hover:bg-amber-50">
              <Lock className="h-4 w-4" /> {(aiTrialRemaining > 0 || trialUsedLocal > 0) ? '무료 체험 모두 사용 · 구독하고 무제한' : '구독하고 AI 분석받기'}
            </Link>
          )}
          {errors[q.id] && <p className="text-xs text-red-600 mt-2">{errors[q.id]}</p>}
        </div>

        {/* 채점 결과 */}
        {grade && (
          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-5">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-black text-[#d97706]">{grade.score}</span>
              <span className="text-sm text-[#64748b]">/ {grade.maxScore}점</span>
            </div>
            <p className="text-sm text-[#334155] leading-relaxed mb-3">{grade.feedback}</p>
            {grade.strengths?.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-bold text-emerald-700 mb-1">잘한 점</p>
                <ul className="text-xs text-[#475569] space-y-0.5 list-disc list-inside">{grade.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {grade.improvements?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-600 mb-1">보완할 점</p>
                <ul className="text-xs text-[#475569] space-y-0.5 list-disc list-inside">{grade.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        {/* 모범답안 */}
        <div className="mt-4">
          <button onClick={() => setShowModel(v => !v)} className="py-2.5 text-xs font-semibold text-amber-700 hover:underline">
            {showModel ? '모범 답안 숨기기' : '모범 답안 보기'}
          </button>
          {showModel && (
            <div className="mt-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4">
              <p className="text-sm text-[#334155] whitespace-pre-wrap leading-relaxed">{q.correct_answer}</p>
            </div>
          )}
        </div>

        {/* 이동 */}
        <div className="flex items-center justify-between mt-7 pt-6 border-t border-[#f1f5f9]">
          <button onClick={() => go(Math.max(0, idx - 1))} disabled={idx === 0} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-30 transition-colors"><ChevronLeft className="h-4 w-4" /> 이전</button>
          <button onClick={() => go(Math.min(questions.length - 1, idx + 1))} disabled={idx === questions.length - 1} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-30 transition-colors">다음 <ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      </div>
      <CopyGuard />
    </div>
  )
}
