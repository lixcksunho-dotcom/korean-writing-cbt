'use client'

// 원고지 그리드 렌더러 (입력 textarea와 분리된 표시 전용 컴포넌트)
// 시험 서술형(긴 글)·원고지 AI 채점 양쪽에서 재사용한다.
// cell 로 칸 크기를 키울 수 있다(서술형 9번 보고서는 크게).

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
  const grid = textToGrid(text, cols, rows)
  const fontPx = Math.round(cell * 0.5)
  const idxW = Math.max(20, Math.round(cell * 0.9))

  return (
    <div className="overflow-x-auto rounded-lg border-2 border-[#1e3a5f]/40 bg-white">
      <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: `${idxW}px` }} />
          {Array.from({ length: cols }, (_, i) => (
            <col key={i} style={{ width: `${cell}px` }} />
          ))}
        </colgroup>
        <tbody>
          {grid.map((row, rowIdx) => (
            <tr key={rowIdx}>
              <td
                className="text-center text-gray-300 border-r border-gray-200 bg-gray-50 select-none"
                style={{ fontSize: `${Math.max(7, Math.round(cell * 0.32))}px` }}
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
                  style={{ height: `${cell}px`, fontSize: `${fontPx}px` }}
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
