'use client'

import { useState, useRef, useTransition } from 'react'
import { Send } from 'lucide-react'
import { gradeManuscript, type GradeResult } from '@/app/(main)/manuscript/actions'
import ManuscriptResult from './ManuscriptResult'

const COLS = 20
const ROWS = 20

const TOPICS = [
  '친환경 생활 방식의 중요성에 대해 자신의 의견을 쓰시오.',
  '디지털 기기 과의존 현상의 문제점과 해결 방안을 쓰시오.',
  '독서가 개인과 사회에 미치는 영향에 대해 쓰시오.',
  '자원봉사 활동의 의미와 활성화 방안에 대해 쓰시오.',
  '직접 입력',
]

function textToGrid(text: string): (string)[][] {
  const grid: string[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(''))
  const lines = text.split('\n')
  let row = 0

  for (const line of lines) {
    if (row >= ROWS) break
    const chars = Array.from(line)
    let col = 0
    for (const char of chars) {
      if (col >= COLS) { row++; col = 0; if (row >= ROWS) break }
      grid[row][col] = char
      col++
    }
    row++
  }
  return grid
}

export default function ManuscriptEditor() {
  const [topicIdx, setTopicIdx] = useState(0)
  const [customTopic, setCustomTopic] = useState('')
  const [text, setText] = useState('')
  const [result, setResult] = useState<GradeResult | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const topic = topicIdx === TOPICS.length - 1 ? customTopic : TOPICS[topicIdx]
  const grid = textToGrid(text)
  const charCount = Array.from(text).filter(c => c !== '\n').length
  const canSubmit = charCount >= 50 && topic.trim().length > 0

  function handleSubmit() {
    if (!canSubmit) return
    setError('')
    startTransition(async () => {
      try {
        const data = await gradeManuscript(text, topic)
        setResult(data)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch {
        setError('채점 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      }
    })
  }

  if (result) {
    return (
      <ManuscriptResult
        result={result}
        topic={topic}
        onReset={() => { setResult(null); setText(''); setError('') }}
      />
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

      {/* 원고지 그리드 */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">원고지 (400자)</p>
          <span className={[
            'text-xs font-medium tabular-nums',
            charCount > 380 ? 'text-red-500' : charCount > 300 ? 'text-amber-500' : 'text-gray-400',
          ].join(' ')}>
            {charCount} / 400자
          </span>
        </div>

        {/* 그리드 컨테이너 */}
        <div
          className="overflow-x-auto rounded-lg border-2 border-[#1e3a5f]/40 cursor-text select-none bg-white"
          onClick={() => textareaRef.current?.focus()}
        >
          <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              {/* 행 번호 열 */}
              <col style={{ width: '20px' }} />
              {Array.from({ length: COLS }, (_, i) => (
                <col key={i} style={{ width: '18px' }} className="sm:w-[22px] md:w-[26px]" />
              ))}
            </colgroup>
            <tbody>
              {grid.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {/* 행 번호 */}
                  <td className="text-center text-[8px] text-gray-300 border-r border-gray-200 bg-gray-50 w-5 select-none">
                    {rowIdx + 1}
                  </td>
                  {row.map((char, colIdx) => (
                    <td
                      key={colIdx}
                      className={[
                        'border border-gray-200 text-center align-middle',
                        'text-[10px] sm:text-[11px] md:text-xs',
                        'h-[20px] sm:h-[24px] md:h-[28px]',
                        'w-[18px] sm:w-[22px] md:w-[26px]',
                        'font-medium text-gray-800',
                        char === '' ? '' : 'bg-blue-50/30',
                      ].join(' ')}
                    >
                      {char}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          클릭 후 아래 입력창에서 작성하면 원고지에 실시간 반영됩니다
        </p>
      </div>

      {/* 텍스트 입력 */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">내용 입력</p>
          <span className="text-[11px] text-gray-400">Enter = 다음 행, 들여쓰기는 공백으로</span>
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`제목 (첫 줄, 가운데 정렬 위해 앞에 공백 사용)\n\n 본문 첫 단락 (앞에 공백 한 칸)\n\n 두 번째 단락...`}
          className="w-full h-52 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e3a5f] transition-colors resize-none font-mono leading-relaxed"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <div className="mt-1.5 bg-gray-50 rounded-lg px-3 py-2 text-[11px] text-gray-500 leading-relaxed">
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
        {isPending ? 'AI 채점 중...' : 'AI 채점하기'}
      </button>

      {charCount > 0 && charCount < 50 && (
        <p className="text-xs text-amber-500 text-center mt-2">
          최소 50자 이상 작성해주세요 (현재 {charCount}자)
        </p>
      )}
    </div>
  )
}
