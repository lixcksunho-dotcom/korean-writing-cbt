'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export type EditableManuscriptHandle = { insertAtCursor: (text: string) => void }

// 입력 가능한 원고지 — 글자를 '칸마다 직접' 그려 공백·숫자·영문까지 정확히 한 칸씩 들어간다.
// 입력은 투명 textarea(한글 IME 정상 동작)가 받고, 화면 글자는 칸 단위로 렌더한다.
// 커서는 현재 입력 위치(selectionStart)를 칸 좌표로 환산해 직접 그린다.
//
// 반응형: 컨테이너 너비를 재서 칸 크기를 자동 축소.
// 스크롤: maxHeightVh를 주면 그 높이 안에서만 세로 스크롤.

// 글자를 행×열 격자에 배치(자동 줄바꿈 20칸, '\n'은 새 줄). ManuscriptGrid와 동일 규칙.
function textToGrid(text: string, cols: number, rows: number): string[][] {
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(''))
  const lines = text.split('\n')
  let row = 0
  for (const line of lines) {
    if (row >= rows) break
    let col = 0
    for (const ch of Array.from(line)) {
      if (col >= cols) { row++; col = 0; if (row >= rows) break }
      if (row >= rows) break
      grid[row][col] = ch
      col++
    }
    row++
  }
  return grid
}

// 커서 인덱스(selectionStart)를 (행, 열) 칸 좌표로 환산 — textToGrid와 같은 규칙.
function caretRC(value: string, sel: number, cols: number) {
  let r = 0, c = 0
  for (const ch of Array.from(value.slice(0, sel))) {
    if (ch === '\n') { r++; c = 0; continue }
    if (c >= cols) { r++; c = 0 }
    c++
  }
  if (c >= cols) { r++; c = 0 }
  return { r, c }
}

const EditableManuscript = forwardRef<EditableManuscriptHandle, {
  value: string
  onChange: (v: string) => void
  cols?: number
  rows?: number
  cell?: number
  placeholder?: string
  maxHeightVh?: number
}>(function EditableManuscript({
  value,
  onChange,
  cols = 20,
  rows = 20,
  cell = 30,
  placeholder,
  maxHeightVh,
}, ref) {
  const boxRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [availW, setAvailW] = useState<number | null>(null)
  const [sel, setSel] = useState(0)
  const [focused, setFocused] = useState(false)

  // 부모(팔레트)에서 커서 위치에 원문자(㉠㉡…)를 삽입할 수 있게 노출
  useImperativeHandle(ref, () => ({
    insertAtCursor: (text: string) => {
      const ta = taRef.current
      const start = ta?.selectionStart ?? value.length
      const end = ta?.selectionEnd ?? value.length
      const next = value.slice(0, start) + text + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        const pos = start + text.length
        ta?.focus()
        try { ta?.setSelectionRange(pos, pos) } catch { /* noop */ }
        setSel(pos)
      })
    },
  }), [value, onChange])

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const update = () => setAvailW(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fitCell = availW
    ? Math.max(14, Math.min(cell, Math.floor((availW - 2) / cols)))
    : cell
  const fontPx = Math.round(fitCell * 0.62)
  const w = cols * fitCell
  const h = rows * fitCell

  const grid = textToGrid(value, cols, rows)
  const syncSel = () => setSel(taRef.current?.selectionStart ?? 0)
  const caret = caretRC(value, sel, cols)
  const caretVisible = focused && caret.r < rows

  return (
    // 바깥 div는 가용 너비 측정 전용. 테두리는 격자 실제 너비(w)에만 둘러 남는 공간이 빈 상자로 보이지 않게 한다.
    <div ref={boxRef} className="w-full">
    <div
      className="mx-auto overflow-auto rounded-lg border-2 border-[#1e3a5f]/40 bg-white overscroll-contain"
      style={{ width: w, ...(maxHeightVh ? { maxHeight: `${maxHeightVh}vh` } : {}) }}
      onMouseDown={() => taRef.current?.focus()}
    >
      <div style={{ position: 'relative', width: w, height: h }}>
        {/* 격자선 */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage:
              'linear-gradient(to right,#d1d5db 1px,transparent 1px),linear-gradient(to bottom,#d1d5db 1px,transparent 1px)',
            backgroundSize: `${fitCell}px ${fitCell}px`,
          }}
        />

        {/* 글자(칸 단위 렌더) */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${fitCell}px)`,
            gridAutoRows: `${fitCell}px`,
            fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif",
            fontSize: `${fontPx}px`,
            color: '#1f2937',
          }}
        >
          {grid.flatMap((row, r) =>
            row.map((ch, c) => (
              <div key={`${r}-${c}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                {ch === ' ' ? ' ' : ch}
              </div>
            ))
          )}
        </div>

        {/* 커서 */}
        {caretVisible && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: caret.c * fitCell + Math.round(fitCell * 0.12),
              top: caret.r * fitCell + Math.round(fitCell * 0.15),
              width: Math.max(1, Math.round(fitCell * 0.06)),
              height: Math.round(fitCell * 0.7),
              background: '#1e3a5f',
              animation: 'kpt-caret-blink 1s steps(1) infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* 플레이스홀더 */}
        {!value && placeholder && (
          <div aria-hidden style={{ position: 'absolute', left: Math.round(fitCell * 0.2), top: Math.round(fitCell * 0.25), color: '#64748b', fontSize: `${Math.max(12, Math.round(fitCell * 0.4))}px`, pointerEvents: 'none' }}>
            {placeholder}
          </div>
        )}

        {/* 입력(투명) — 글자·커서는 위에서 직접 그리므로 여기선 보이지 않게 */}
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => { onChange(e.target.value); syncSel() }}
          onSelect={syncSel}
          onKeyUp={syncSel}
          onClick={syncSel}
          onFocus={() => { setFocused(true); syncSel() }}
          onBlur={() => setFocused(false)}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          style={{
            position: 'absolute', inset: 0, width: w, height: h,
            background: 'transparent', border: 'none', outline: 'none', resize: 'none',
            margin: 0, padding: 0,
            fontFamily: "'Malgun Gothic','맑은 고딕',monospace",
            fontSize: `${fontPx}px`, lineHeight: `${fitCell}px`,
            color: 'transparent', caretColor: 'transparent',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflow: 'hidden',
          }}
        />
      </div>
      <style>{`@keyframes kpt-caret-blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}`}</style>
    </div>
    </div>
  )
})

export default EditableManuscript
