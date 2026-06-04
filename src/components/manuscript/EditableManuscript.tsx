'use client'

// 입력 가능한 원고지 — 투명 textarea를 격자 위에 겹쳐, 칸에 바로 타이핑되게 한다.
// 진짜 textarea라서 한글 IME 조합도 정상 동작하고, 글자는 격자 칸에 맞춰 보인다.
// (한글·공백은 한 칸에 거의 정확히, 숫자/영문은 약간의 오차가 있을 수 있으나 실사용엔 충분)

export default function EditableManuscript({
  value,
  onChange,
  cols = 20,
  rows = 20,
  cell = 30,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  cols?: number
  rows?: number
  cell?: number
  placeholder?: string
}) {
  const fontPx = Math.round(cell * 0.66)
  const ls = cell - fontPx          // 글자 뒤 여백 → 한 글자 = 한 칸
  const ti = Math.round(ls / 2)     // 칸 안에서 가로 가운데로 살짝 밀기
  const w = cols * cell
  const h = rows * cell

  return (
    <div className="overflow-x-auto rounded-lg border-2 border-[#1e3a5f]/40 bg-white">
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
            backgroundSize: `${cell}px ${cell}px`,
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
            lineHeight: `${cell}px`,
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
