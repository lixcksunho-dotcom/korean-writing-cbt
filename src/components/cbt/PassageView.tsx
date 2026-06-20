// 서술형 지문·자료 렌더러 — 실제 시험지처럼 <자료 N>/<보기>/(가)(나)/표를 박스·표로 구분해 보여준다.
// 데이터(passage)는 일반 텍스트지만, 다음 규칙으로 구조를 인식한다:
//  - 한 줄이 <...> 또는 (가)(나)(다) → 새 '자료' 박스의 제목
//  - 한 줄이 [....] → 박스 안 소제목 (장점/단점 등)
//  - " / " 가 들어간 연속 줄 → 표 (칸 수가 일치하면 진짜 <table>)
//  - -, *, • 로 시작 → 목록
//  - 그 외 → 문단

type Block =
  | { kind: 'subhead'; text: string }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'pre'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'image'; url: string; alt: string }
  | { kind: 'para'; text: string }

type Section = { label?: string; subtitle?: string; blocks: Block[] }

const isSubhead = (t: string) => /^\[[^\]]+\]$/.test(t)
const isListItem = (t: string) => /^[-*•]\s+/.test(t)
const isTableLine = (t: string) => t.includes(' / ')
const imageMatch = (t: string) => t.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/)

function parsePassage(raw: string): Section[] {
  const lines = raw.replace(/\r/g, '').split('\n')
  const sections: Section[] = []
  let cur: Section = { blocks: [] }
  sections.push(cur)

  let i = 0
  while (i < lines.length) {
    const t = lines[i].trim()

    if (t === '') { i++; continue }

    // 새 자료 박스 제목: <자료 N> 또는 (가)
    const angle = t.match(/^<([^>]+)>\s*(.*)$/)
    const paren = t.match(/^\(([가-마])\)\s*(.*)$/)
    if (angle || paren) {
      cur = {
        label: angle ? angle[1].trim() : `(${paren![1]})`,
        subtitle: (angle ? angle[2] : paren![2]).trim() || undefined,
        blocks: [],
      }
      sections.push(cur)
      i++
      continue
    }

    // 이미지(그래프 등): ![alt](https://...)
    const im = imageMatch(t)
    if (im) {
      cur.blocks.push({ kind: 'image', alt: im[1], url: im[2] })
      i++
      continue
    }

    // 소제목 [장점]
    if (isSubhead(t)) {
      cur.blocks.push({ kind: 'subhead', text: t.slice(1, -1).trim() })
      i++
      continue
    }

    // 표: " / " 연속 줄
    if (isTableLine(t)) {
      const rows: string[][] = []
      while (i < lines.length && isTableLine(lines[i].trim())) {
        rows.push(lines[i].trim().split('/').map(c => c.trim()))
        i++
      }
      const len = rows[0].length
      const aligned = rows.every(r => r.length === len) && len >= 2
      cur.blocks.push(aligned ? { kind: 'table', rows } : { kind: 'pre', text: rows.map(r => r.join('  /  ')).join('\n') })
      continue
    }

    // 목록
    if (isListItem(t)) {
      const items: string[] = []
      while (i < lines.length && isListItem(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''))
        i++
      }
      cur.blocks.push({ kind: 'list', items })
      continue
    }

    // 문단 (한 줄 = 한 문단)
    cur.blocks.push({ kind: 'para', text: t })
    i++
  }

  return sections.filter(s => s.label || s.blocks.length)
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        if (b.kind === 'subhead')
          return <p key={i} className="text-[13px] font-bold text-[#1e3a5f] mt-1">{b.text}</p>
        if (b.kind === 'para')
          return <p key={i} className="text-[14.5px] text-[#1f2937] leading-[1.85]">{b.text}</p>
        if (b.kind === 'pre')
          return <pre key={i} className="text-[13px] text-[#1f2937] font-mono whitespace-pre-wrap leading-relaxed">{b.text}</pre>
        if (b.kind === 'image')
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={i} src={b.url} alt={b.alt || '자료 그래프'} className="my-1 w-full max-w-md rounded-lg border border-[#e2e8f0]" />
        if (b.kind === 'list')
          return (
            <ul key={i} className="list-disc pl-5 space-y-0.5 text-[14px] text-[#334155] leading-relaxed">
              {b.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          )
        // table
        const [head, ...body] = b.rows
        return (
          <div key={i} className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr>
                  {head.map((c, j) => (
                    <th key={j} className="border border-[#cbd5e1] bg-[#eef2f7] px-2.5 py-1.5 font-bold text-[#0f172a] text-center whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((c, ci) => (
                      <td key={ci} className={`border border-[#cbd5e1] px-2.5 py-1.5 text-center ${ci === 0 ? 'font-semibold text-[#334155] bg-[#f8fafc]' : 'text-[#475569]'}`}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

export default function PassageView({ text }: { text: string }) {
  const sections = parsePassage(text)

  return (
    <div className="space-y-3">
      {sections.map((s, i) =>
        s.label ? (
          <div key={i} className="rounded-xl border border-[#d7e0ec] bg-white overflow-hidden">
            <div className="flex items-baseline gap-2 bg-[#1e3a5f]/[0.06] px-3.5 py-2 border-b border-[#d7e0ec]">
              <span className="text-[13px] font-black text-[#1e3a5f]">{s.label}</span>
              {s.subtitle && <span className="text-xs text-[#64748b]">{s.subtitle}</span>}
            </div>
            <div className="px-3.5 py-3">
              <Blocks blocks={s.blocks} />
            </div>
          </div>
        ) : (
          <div key={i} className="px-0.5">
            <Blocks blocks={s.blocks} />
          </div>
        )
      )}
    </div>
  )
}
