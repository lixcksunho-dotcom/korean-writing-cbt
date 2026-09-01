'use client'

import { Gauge } from 'lucide-react'
import { computePace, paceMessage } from '@/lib/examPace'

// 시험 중 한 줄짜리 속도 안내. 남은 시간만으로는 자기가 늦은 건지 알 수 없다.
//
// 눈에 띄되 방해하지 않게: 시계 아래 한 줄, 색은 상태가 나쁠 때만 붉어진다.
// 매초 바뀌므로 aria-live는 쓰지 않는다 — 화면 낭독기가 계속 읽으면 시험을 못 본다.
export default function PaceGuide({
  answered,
  total,
  elapsedSec,
  leftSec,
}: {
  answered: number
  total: number
  elapsedSec: number
  leftSec: number
}) {
  const pace = computePace(answered, total, elapsedSec, leftSec)
  if (pace.kind === 'warmup') return null

  const behind = pace.kind === 'behind'
  const tight = pace.kind === 'tight'

  return (
    <p
      className={`flex items-center gap-1.5 text-xs font-semibold ${
        behind ? 'text-red-700' : tight ? 'text-amber-700' : 'text-[#64748b]'
      }`}
    >
      <Gauge className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {paceMessage(pace)}
    </p>
  )
}
