'use client'

import { useEffect, useRef, useState } from 'react'

// 입력 가능한 원고지 — 투명 textarea를 격자 위에 겹쳐, 칸에 바로 타이핑되게 한다.
// 진짜 textarea라서 한글 IME 조합도 정상 동작하고, 글자는 격자 칸에 맞춰 보인다.
// (한글·공백은 한 칸에 거의 정확히, 숫자/영문은 약간의 오차가 있을 수 있으나 실사용엔 충분)
//
// 반응형: 컨테이너 실제 너비를 재서 칸 크기를 자동 축소 → 모바일에서도 가로 오버플로우 없이 꽉 참.
// 스크롤: maxHeightVh를 주면 원고지가 그 높이 안에서만 세로 스크롤된다(문제는 위에 고정).

export default function EditableManuscript({
  value,
  onChange,
  cols = 20,
  rows = 20,
  cell = 30,
  placeholder,
  maxHeightVh,
}: {
  value: string
  onChange: (v: string) => void
  cols?: number
  rows?: number
  cell?: number
  placeholder?: string
  /** 주면 이 높이(vh) 안에서만 세로 스크롤 — 문제는 화면에 고정 */
  maxHeightVh?: number
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [availW, setAvailW] = useState<number | null>(null)

  // 컨테이너(스크롤 박스) 너비를 측정해, 칸 크기를 그 너비에 맞게 축소한다.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const update = () => setAvailW(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 사용 칸 크기: 화면에 맞춰 축소하되 prop(cell)을 넘지 않음. 최소 14px 보장.
  const fitCell = availW
    ? Math.max(14, Math.min(cell, Math.floor((availW - 2) / cols)))
    : cell

  const fontPx = Math.round(fitCell * 0.66)
  const ls = fitCell - fontPx        // 글자 뒤 여백 → 한 글자 = 한 칸
  const ti = Math.round(ls / 2)      // 칸 안에서 가로 가운데로 살짝 밀기
  const w = cols * fitCell
  const h = rows * fitCell

  return (
    <div
      ref={boxRef}
      className="overflow-auto rounded-lg border-2 border-[#1e3a5f]/40 bg-white overscroll-contain"
      style={maxHeightVh ? { maxHeight: `${maxHeightVh}vh` } : undefined}
    >
      <div style={{ position: 'relative', width: w, height: h }}>
        {/* 격자 배경 */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage:
              'linear-gradient(to right,#d1d5db 1px,transparent 1px),linear-gradient(to bottom,#d1d5db 1px,transparent 1px)',
            backgroundSize: `${fitCell}px ${fitCell}px`,
          }}
        />
        {/* 입력 (투명, 격자 위) */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          style={{
            position: 'absolute',
            inset: 0,
            width: w,
            height: h,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            margin: 0,
            padding: 0,
            fontFamily: "'Malgun Gothic','맑은 고딕',monospace",
            fontSize: `${fontPx}px`,
            lineHeight: `${fitCell}px`,
            letterSpacing: `${ls}px`,
            textIndent: `${ti}px`,
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            color: '#1f2937',
            caretColor: '#1e3a5f',
          }}
        />
      </div>
    </div>
  )
}
