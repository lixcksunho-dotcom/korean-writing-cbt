'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, FileText, ChevronDown, RotateCcw, Settings2, ListRestart } from 'lucide-react'
import CopyGuard from '@/components/cbt/CopyGuard'
import PassageView from '@/components/cbt/PassageView'
import MarkedText from '@/components/cbt/MarkedText'
import {
  type PracticePrefs, readPrefsRaw, parsePrefs, savePrefs, shuffleWithSeed, choiceOrder, newSeed,
} from '@/lib/practiceSession'

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
  audio_url?: string | null
}

const CIRCLE = ['①', '②', '③', '④', '⑤']
// localStorage는 구독할 게 없다 — 마운트 시점 값만 필요하다.
const noSubscribe = () => () => {}

export default function PracticeMultiple({
  questions,
  title,
  backHref = '/practice/multiple',
}: {
  questions: PracticeQuestion[]
  title: string
  backHref?: string
}) {
  // ── 풀이 설정 ──────────────────────────────────────────────────────────
  // 경쟁 CBT가 전부 주는 세 가지: 문항 순서 섞기 · 보기 순서 섞기 · 정답 공개 시점.
  // 같은 회차를 두 번째 풀 때 "답은 ③"을 위치로 외워 버리는 걸 막는다.
  const rawPrefs = useSyncExternalStore(noSubscribe, readPrefsRaw, () => null)
  const storedPrefs = useMemo(() => parsePrefs(rawPrefs), [rawPrefs])
  const [prefEdits, setPrefEdits] = useState<PracticePrefs | null>(null)
  const prefs = prefEdits ?? storedPrefs
  const [settingsOpen, setSettingsOpen] = useState(false)
  // 섞는 순서는 씨앗으로 재현한다 — '다시 풀기'마다 새 씨앗.
  const [seed, setSeed] = useState<number>(() => newSeed())
  // '틀린 문제만 다시 풀기' — 비어 있으면 전체.
  const [pool, setPool] = useState<Set<string> | null>(null)

  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<Record<string, string>>({})
  // '다 풀고 채점' 모드에서 채점하기를 눌렀는지
  const [graded, setGraded] = useState(false)
  const [passageOpen, setPassageOpen] = useState(true)

  const ordered = useMemo(() => {
    const base = pool ? questions.filter(q => pool.has(q.id)) : questions
    return prefs.order === 'random' ? shuffleWithSeed(base, seed) : base
  }, [questions, pool, prefs.order, seed])

  const q = ordered[idx] ?? ordered[0]
  const chosen = picked[q.id]
  const instant = prefs.reveal === 'instant'
  // 즉시 모드: 고르면 공개. 채점 모드: '채점하기' 뒤에만 공개.
  const revealed = instant ? chosen != null : graded
  const correct = revealed && chosen === q.correct_answer
  const solved = ordered.filter(x => picked[x.id] != null).length
  const right = ordered.filter(x => picked[x.id] === x.correct_answer).length
  const wrongIds = ordered.filter(x => picked[x.id] != null && picked[x.id] !== x.correct_answer).map(x => x.id)
  // 화면 i번째 보기 → 원래 보기 번호. 답은 항상 원래 번호로 저장·채점한다.
  const order = useMemo(
    () => choiceOrder(q.options.length, q.id, seed, prefs.shuffleChoices),
    [q.options.length, q.id, seed, prefs.shuffleChoices],
  )
  const answerLabel = CIRCLE[order.indexOf(parseInt(q.correct_answer) - 1)] ?? q.correct_answer

  function restart() {
    setPicked({})
    setGraded(false)
    setSeed(newSeed())
    setIdx(0)
    setPassageOpen(true)
  }

  function updatePrefs(patch: Partial<PracticePrefs>) {
    const next = { ...prefs, ...patch }
    setPrefEdits(next)
    savePrefs(next)
    // 순서·보기 설정이 바뀌면 이미 고른 답의 위치 의미가 달라진다 — 처음부터 다시.
    if (patch.order !== undefined || patch.shuffleChoices !== undefined) restart()
    if (patch.reveal !== undefined) setGraded(false)
  }

  function choose(val: string) {
    // 즉시 모드는 답한 문제를 고정한다. 채점 모드는 채점 전까지 바꿀 수 있다.
    if (instant && picked[q.id] != null) return
    if (graded) return
    setPicked(prev => ({ ...prev, [q.id]: val }))
  }

  function go(n: number) {
    setIdx(Math.min(Math.max(0, n), ordered.length - 1))
    setPassageOpen(true)
  }

  function reset() {
    setPool(null)
    restart()
  }

  function retryWrong() {
    if (wrongIds.length === 0) return
    setPool(new Set(wrongIds))
    restart()
  }

  const isLast = idx === ordered.length - 1
  const allDone = solved === ordered.length
  // 결과 요약을 보여 줄 조건 — 즉시 모드는 다 풀면, 채점 모드는 채점하면.
  const finished = instant ? allDone : graded
  const heading = pool ? `틀린 문제 다시 풀기 (${ordered.length}문항)` : title

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <Link href={backHref} className="inline-flex items-center gap-1.5 py-3 text-sm text-[#64748b] hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" /> {heading}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[#64748b]">{idx + 1} / {ordered.length}</span>
          {instant || graded ? (
            <span className="font-semibold text-emerald-700">정답 {right}<span className="text-[#64748b]">/{solved}</span></span>
          ) : (
            <span className="font-semibold text-[#334155]">푼 문항 {solved}<span className="text-[#64748b]">/{ordered.length}</span></span>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(v => !v)}
            aria-expanded={settingsOpen}
            aria-controls="practice-settings"
            className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold text-[#1e3a5f] hover:bg-[#f1f5f9]"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">풀이 설정</span>
          </button>
        </div>
      </div>

      {/* 풀이 설정 — 경쟁 CBT 공통 선택지. 바꾸면 처음부터 다시 푼다. */}
      {settingsOpen && (
        <div id="practice-settings" className="mb-5 rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-[0_4px_16px_rgba(15,31,61,0.06)]">
          <div className="grid gap-3 sm:grid-cols-3">
            <PrefSelect
              label="문항 순서"
              value={prefs.order}
              options={[['sequential', '순서대로'], ['random', '무작위']]}
              onChange={v => updatePrefs({ order: v as PracticePrefs['order'] })}
            />
            <PrefSelect
              label="보기 순서"
              value={prefs.shuffleChoices ? 'on' : 'off'}
              options={[['off', '그대로'], ['on', '섞기']]}
              onChange={v => updatePrefs({ shuffleChoices: v === 'on' })}
            />
            <PrefSelect
              label="정답 확인"
              value={prefs.reveal}
              options={[['instant', '고르면 바로'], ['deferred', '다 풀고 채점']]}
              onChange={v => updatePrefs({ reveal: v as PracticePrefs['reveal'] })}
            />
          </div>
          <p className="mt-3 text-xs text-[#64748b]">순서·보기 설정을 바꾸면 처음부터 다시 풀어요. 설정은 이 브라우저에 기억돼요.</p>
        </div>
      )}

      {/* 진행 바 */}
      <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden mb-5">
        <div className="h-full bg-gradient-to-r from-[#1e3a5f] to-[#3d6aa0] rounded-full transition-all duration-300" style={{ width: `${(solved / ordered.length) * 100}%` }} />
      </div>

      {/* 지문 */}
      {q.passage && (
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl mb-4 overflow-hidden">
          <button onClick={() => setPassageOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#f1f5f9] transition-colors">
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#1e3a5f]" /><span className="text-sm font-bold text-[#1e3a5f]">지 문</span></div>
            <ChevronDown className={`h-4 w-4 text-[#64748b] transition-transform ${passageOpen ? 'rotate-180' : ''}`} />
          </button>
          {passageOpen && <div className="px-5 pb-5 pt-1 max-h-96 overflow-y-auto"><PassageView text={q.passage} /></div>}
        </div>
      )}

      {/* 문제 카드 */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-6 md:p-7">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm font-bold text-[#1e3a5f] bg-[#1e3a5f]/8 px-3.5 py-1.5 rounded-full">{q.year}-{q.round} · {q.number}번</span>
          {prefs.shuffleChoices && <span className="text-xs font-semibold text-[#64748b]">보기 섞음</span>}
        </div>
        <p className="text-[#0f172a] font-medium leading-relaxed mb-7 whitespace-pre-wrap text-base"><MarkedText text={q.question} /></p>

        {q.audio_url && (
          <div className="mb-7 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
            <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-[#1e3a5f]">
              🎧 듣기 <span className="text-[#64748b] font-medium">음성을 듣고 답하세요</span>
            </div>
            <audio
                  controls
                  // 브라우저 기본 메뉴(⋮)에 '다운로드'가 뜬다 — 만들어 둔 음성이 그대로 새어 나간다.
                  // 완전히 막을 수는 없지만(주소를 직접 열면 된다) 화면에서 한 번 누르면 되는 길은 닫아 둔다.
                  controlsList="nodownload noplaybackrate"
                  onContextMenu={e => e.preventDefault()}
                  preload="none"
                  src={q.audio_url}
                  className="w-full"
                >
              브라우저가 오디오 재생을 지원하지 않습니다.
            </audio>
          </div>
        )}

        <div className="space-y-2.5">
          {order.map((orig, i) => {
            const option = q.options[orig]
            const val = String(orig + 1)
            const isPicked = chosen === val
            const isAnswer = q.correct_answer === val
            let cls = 'border-[#e2e8f0] text-[#334155] hover:border-[#94a3b8] hover:bg-[#f8fafc]'
            if (revealed) {
              if (isAnswer) cls = 'border-emerald-400 bg-emerald-50 text-emerald-800'
              else if (isPicked) cls = 'border-red-300 bg-red-50 text-red-700'
              else cls = 'border-[#e2e8f0] text-[#64748b]'
            } else if (isPicked) {
              // 채점 전(다 풀고 채점 모드)에도 고른 보기는 보여야 바꿀 수 있다
              cls = 'border-[#1e3a5f] bg-[#1e3a5f]/8 text-[#0f172a]'
            }
            return (
              <button
                key={orig}
                onClick={() => choose(val)}
                disabled={revealed}
                aria-pressed={isPicked}
                className={`w-full text-left px-5 py-3.5 rounded-xl border-2 transition-all text-sm font-medium flex items-center gap-2.5 ${cls} ${revealed ? 'cursor-default' : ''}`}
              >
                <span className="font-bold">{CIRCLE[i]}</span>
                <span className="flex-1"><MarkedText text={option} /></span>
                {revealed && isAnswer && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                {revealed && isPicked && !isAnswer && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* 채점 결과 + 해설 */}
        {revealed && (
          <div className={`mt-5 rounded-xl px-4 py-3.5 ${correct ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
            <p className={`text-sm font-bold flex items-center gap-1.5 ${correct ? 'text-emerald-700' : 'text-red-700'}`}>
              {correct ? (
                <><CheckCircle2 className="h-4 w-4" /> 정답이에요!</>
              ) : chosen == null ? (
                <><XCircle className="h-4 w-4" /> 답을 고르지 않았어요. 정답은 {answerLabel} 입니다.</>
              ) : (
                <><XCircle className="h-4 w-4" /> 아쉬워요. 정답은 {answerLabel} 입니다.</>
              )}
            </p>
            {q.explanation && <p className="text-xs text-[#475569] leading-relaxed mt-2 whitespace-pre-wrap">💡 {q.explanation}</p>}
          </div>
        )}

        {/* 이동 */}
        <div className="flex items-center justify-between mt-7 pt-6 border-t border-[#f1f5f9]">
          <button onClick={() => go(idx - 1)} disabled={idx === 0} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-30 transition-colors">이전</button>
          {!isLast ? (
            <button onClick={() => go(idx + 1)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white">다음 <ChevronRight className="h-4 w-4" /></button>
          ) : !instant && !graded ? (
            <button
              onClick={() => { setGraded(true); go(0) }}
              disabled={solved === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-50"
            >
              채점하기 ({solved}/{ordered.length})
            </button>
          ) : (
            <button onClick={reset} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#1e3a5f] border-2 border-[#1e3a5f] hover:bg-[#1e3a5f]/5"><RotateCcw className="h-4 w-4" /> 다시 풀기</button>
          )}
        </div>
      </div>

      {finished && (
        <div className="mt-5 bg-white rounded-2xl border border-emerald-200 p-5 text-center">
          <p className="text-sm text-[#64748b]">연습 완료! 총 <span className="font-bold text-[#0f172a]">{ordered.length}</span>문항 중 <span className="font-bold text-emerald-700">{right}</span>문항 정답 ({Math.round((right / ordered.length) * 100)}%)</p>
          {/* 경쟁 CBT의 '오답 중심 재출제' — 틀린 것만 모아 바로 한 번 더. */}
          {wrongIds.length > 0 && (
            <button
              type="button"
              onClick={retryWrong}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-[#1e3a5f] px-4 py-2 text-sm font-semibold text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
            >
              <ListRestart className="h-4 w-4" aria-hidden="true" /> 틀린 {wrongIds.length}문항만 다시 풀기
            </button>
          )}
          {pool && (
            <div className="mt-2">
              <button type="button" onClick={reset} className="inline-flex min-h-11 items-center text-xs font-bold text-[#1e3a5f] underline underline-offset-4">전체 문항으로 돌아가기</button>
            </div>
          )}
        </div>
      )}
      <CopyGuard />
    </div>
  )
}

function PrefSelect({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: [string, string][]
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-[#64748b]">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex rounded-xl border border-[#e2e8f0] p-1">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`flex-1 min-h-11 rounded-lg px-2 text-xs font-bold transition-colors ${
              value === v ? 'bg-[#1e3a5f] text-white' : 'text-[#475569] hover:bg-[#f1f5f9]'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
