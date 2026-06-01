'use client'

// 원고지 그리드 렌더러 (입력 textarea와 분리된 표시 전용 컴포넌트)
// 시험 서술형(긴 글)·원고지 AI 채점 양쪽에서 재사용한다.

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
}: {
  text: string
  cols?: number
  rows?: number
}) {
  const grid = textToGrid(text, cols, rows)

  return (
    <div className="overflow-x-auto rounded-lg border-2 border-[#1e3a5f]/40 bg-white">
      <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '22px' }} />
          {Array.from({ length: cols }, (_, i) => (
            <col key={i} style={{ width: '22px' }} />
          ))}
        </colgroup>
        <tbody>
          {grid.map((row, rowIdx) => (
            <tr key={rowIdx}>
              <td className="text-center text-[8px] text-gray-300 border-r border-gray-200 bg-gray-50 select-none">
                {rowIdx + 1}
              </td>
              {row.map((char, colIdx) => (
                <td
                  key={colIdx}
                  className={[
                    'border border-gray-200 text-center align-middle',
                    'text-[10px] sm:text-[11px] md:text-xs',
                    'h-[22px] md:h-[26px] font-medium text-gray-800',
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
  )
}
