'use client'

// 서술형 답안 입력용 원문자(㉠㉡㉢…) 삽입 팔레트.
// 문제/지문에 그 라벨이 있을 때만 표시되며, 클릭하면 답안 입력칸의 커서 위치에 삽입된다.
// onMouseDown에서 preventDefault → 버튼 클릭이 입력칸의 포커스/커서를 뺏지 않도록 한다.

export default function SymbolPalette({
  symbols,
  onInsert,
}: {
  symbols: string[]
  onInsert: (s: string) => void
}) {
  if (!symbols.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
      <span className="text-xs font-semibold text-[#64748b] mr-0.5">기호 삽입</span>
      {symbols.map(s => (
        <button
          key={s}
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsert(s)}
          className="min-w-8 h-8 px-2 rounded-lg border border-[#cbd5e1] bg-white text-sm font-semibold text-[#1e3a5f] hover:border-[#1e3a5f] hover:bg-[#1e3a5f]/5 active:scale-95 transition"
          aria-label={`${s} 삽입`}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
