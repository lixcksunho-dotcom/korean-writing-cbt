'use client'

import { useEffect, useRef, useState } from 'react'

// 원고지 그리드 렌더러 (입력 textarea와 분리된 표시 전용 컴포넌트)
// 시험 서술형(긴 글)·원고지 AI 채점 양쪽에서 재사용한다.
// cell 로 칸 크기를 키울 수 있다(서술형 9번 보고서는 크게).
// 반응형: 컨테이너 너비를 재서 칸 크기를 자동 축소 → 모바일에서도 가로 오버플로우 없이 꽉 참.

function textToGrid(text: string, cols: number, rows: number): string[][] {
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(''))
  const lines = text.split('\n')
  let row = 0
  for (const line of lines) {
    if (row >= rows) break
    const chars = Array.from(line)
    let col = 0
    for (const char of chars) {
      if (col >= cols) { row++; col = 0; if (row >= rows) break }
      grid[row][col] = char
      col++
    }
    row++
  }
  return grid
}

export default function ManuscriptGrid({
  text,
  cols = 20,
  rows = 20,
  cell = 22,
}: {
  text: string
  cols?: number
  rows?: number
  cell?: number
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [availW, setAvailW] = useState<number | null>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const update = () => setAvailW(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 인덱스열(~22px) 자리를 빼고 남은 너비에 칸을 맞춤. prop(cell)을 넘지 않음.
  const fitCell = availW
    ? Math.max(16, Math.min(cell, Math.floor((availW - 24) / cols)))
    : cell

  const grid = textToGrid(text, cols, rows)
  // 휴대폰에서는 20칸을 맞추느라 칸이 18px까지 줄어든다. 글자를 칸의 절반(9px)으로 그리면
  // 자기가 쓴 답을 못 읽는다. 원고지는 원래 글자가 칸을 거의 채우므로 비율을 올리고
  // 11px 바닥을 둔다 — 가로 스크롤 없이 읽히게 하는 쪽을 택했다.
  const fontPx = Math.max(11, Math.round(fitCell * 0.62))
  const idxW = Math.max(18, Math.round(fitCell * 0.9))

  return (
    <div ref={boxRef} className="overflow-x-auto rounded-lg border-2 border-[#1e3a5f]/40 bg-white">
      <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: `${idxW}px` }} />
          {Array.from({ length: cols }, (_, i) => (
            <col key={i} style={{ width: `${fitCell}px` }} />
          ))}
        </colgroup>
        <tbody>
          {grid.map((row, rowIdx) => (
            <tr key={rowIdx}>
              <td
                className="text-center text-gray-500 border-r border-gray-200 bg-gray-50 select-none"
                style={{ fontSize: `${Math.max(11, Math.round(fitCell * 0.4))}px` }}
              >
                {rowIdx + 1}
              </td>
              {row.map((char, colIdx) => (
                <td
                  key={colIdx}
                  className={[
                    'border border-gray-200 text-center align-middle font-medium text-gray-800',
                    char === '' ? '' : 'bg-blue-50/30',
                  ].join(' ')}
                  style={{ height: `${fitCell}px`, fontSize: `${fontPx}px` }}
                >
                  {char}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
