// 문항 본문의 밑줄 표기 렌더러.
// 실제 시험지처럼 "밑줄 친 ○○" 대상을 눈에 보이게 하려고, 문항 텍스트에
// __대상__ 형태로 저장해 두고 여기서 <u>로 그린다. (마크다운 전체가 아니라 밑줄만 지원)
const UNDERLINE = /__(.+?)__/g

export default function MarkedText({ text, className }: { text: string; className?: string }) {
  if (!text.includes('__')) return <span className={className}>{text}</span>

  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(UNDERLINE)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(
      <u key={m.index} className="underline underline-offset-4 decoration-2 decoration-[#1e3a5f]/60">
        {m[1]}
      </u>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))

  return <span className={className}>{parts}</span>
}
