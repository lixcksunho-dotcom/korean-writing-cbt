'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Send } from 'lucide-react'
import { gradeManuscript, type GradeResult } from '@/app/(main)/manuscript/actions'
import ManuscriptResult from './ManuscriptResult'
import EditableManuscript from './EditableManuscript'

const TOPICS = [
  '친환경 생활 방식의 중요성에 대해 자신의 의견을 쓰시오.',
  '디지털 기기 과의존 현상의 문제점과 해결 방안을 쓰시오.',
  '독서가 개인과 사회에 미치는 영향에 대해 쓰시오.',
  '자원봉사 활동의 의미와 활성화 방안에 대해 쓰시오.',
  '직접 입력',
]

export default function ManuscriptEditor({
  hasSubscription = true,
  trialRemaining = 0,
}: {
  hasSubscription?: boolean
  trialRemaining?: number
}) {
  const [topicIdx, setTopicIdx] = useState(0)
  const [customTopic, setCustomTopic] = useState('')
  const [text, setText] = useState('')
  const [result, setResult] = useState<GradeResult | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [remaining, setRemaining] = useState(trialRemaining)

  const topic = topicIdx === TOPICS.length - 1 ? customTopic : TOPICS[topicIdx]
  const charCount = Array.from(text).filter(c => c !== '\n').length
  const canSubmit = charCount >= 50 && topic.trim().length > 0

  function handleSubmit() {
    if (!canSubmit) return
    setError('')
    startTransition(async () => {
      try {
        const data = await gradeManuscript(text, topic)
        setResult(data)
        if (!hasSubscription) setRemaining(r => Math.max(0, r - 1))
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        setError(
          msg === 'SUBSCRIPTION_REQUIRED'
            ? '무료 체험을 모두 사용했어요. 이용권을 열면 무제한으로 채점받을 수 있어요.'
            : '채점 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        )
      }
    })
  }

  if (result) {
    return (
      <div>
        <ManuscriptResult
          result={result}
          topic={topic}
          onReset={() => { setResult(null); setText(''); setError('') }}
        />
        {/* 첨삭을 막 확인한 직후가 전환이 가장 잘 되는 순간 */}
        {!hasSubscription && (
          <Link
            href="/subscribe"
            className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-[#fffbeb] to-[#fff7ed] px-5 py-4 hover:border-amber-300 transition-colors"
          >
            <span className="text-sm text-[#334155]">
              {remaining > 0
                ? <>무료 체험 <b className="text-amber-600">{remaining}회</b> 남았어요 · 이용권을 열면 <b>30일 무제한</b></>
                : <>무료 체험을 모두 썼어요 · <b>30일 무제한</b>으로 계속 첨삭받기</>}
            </span>
            <span className="shrink-0 text-sm font-black text-[#1e3a5f] whitespace-nowrap">5,500원 →</span>
          </Link>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* 주제 선택 */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">작성 주제 선택</p>
        <div className="space-y-2">
          {TOPICS.map((t, i) => (
            <button
              key={i}
              onClick={() => setTopicIdx(i)}
              className={[
                'w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-colors',
                topicIdx === i
                  ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f] font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
              ].join(' ')}
            >
              {i < TOPICS.length - 1 ? `${i + 1}. ${t}` : t}
            </button>
          ))}
        </div>
        {topicIdx === TOPICS.length - 1 && (
          <input
            type="text"
            value={customTopic}
            onChange={e => setCustomTopic(e.target.value)}
            placeholder="주제를 직접 입력하세요"
            className="mt-2 w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e3a5f] transition-colors"
          />
        )}
      </div>

      {/* 원고지 입력 (칸에 바로 작성) */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          {/* 400자만 보이면 그만큼 써야 하는 줄 안다. 실제 하한은 50자인데 그 안내가
              뭔가 입력한 뒤에야 떠서, 빈 화면에서는 400자짜리 과제로만 보였다. */}
          <p className="text-sm font-semibold text-gray-700">원고지 — 50자부터 채점돼요</p>
          <span className={[
            'text-xs font-medium tabular-nums',
            charCount > 380 ? 'text-red-500' : charCount > 300 ? 'text-amber-500' : 'text-gray-400',
          ].join(' ')}>
            {charCount} / 400자
          </span>
        </div>
        <EditableManuscript
          value={text}
          onChange={setText}
          cols={20}
          rows={20}
          cell={30}
          placeholder="원고지 칸에 바로 입력하세요"
        />
        <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 leading-relaxed">
          <span className="font-medium text-gray-600">원고지 규칙 안내</span>
          {' · '}제목: 첫 줄 오른쪽에서 2~4칸 비우고 시작
          {' · '}본문: 각 단락 첫 칸 공백 들여쓰기
          {' · '}문어체(~ㄴ다, ~이다) 사용
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={isPending || !canSubmit}
        className="w-full flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#2d5488] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
      >
        <Send className="h-4 w-4" />
        {isPending ? 'AI 채점 중...' : hasSubscription ? 'AI 채점하기' : `무료로 AI 채점받기 (${remaining}회 남음)`}
      </button>

      {charCount > 0 && charCount < 50 && (
        <p className="text-xs text-amber-500 text-center mt-2">
          최소 50자 이상 작성해주세요 (현재 {charCount}자)
        </p>
      )}
    </div>
  )
}
