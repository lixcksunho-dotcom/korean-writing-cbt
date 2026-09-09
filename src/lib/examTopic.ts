// 회차가 어떤 글을 쓰게 하는지 한 줄로 뽑는다.
//
// 왜 필요한가: 회차 목록에는 '모의고사 N회 · 39문항'만 있어서, 무엇이 다른지 알려면 열어
// 보는 수밖에 없었다. 실제로 16초 간격으로 두 회차를 열었다 나간 기록이 있다(2026-09-09).
// 회차를 가르는 것은 마지막 서술형(300점 보고서)의 주제다 — 그걸 목록에 적어 준다.
//
// 주제는 문항 지문 안에 따옴표로 묶여 있다. 따옴표 모양이 회차마다 제각각이라
// (" ' ‘ ’ “ ” 「 『) 전부 받아 준다.

const QUOTED = /["'‘“「『]([^"'’”」』\n]{4,40})["'’”」』]/g
/** 주제 뒤에 흔히 붙는 말 — 이 앞의 따옴표가 진짜 주제다. */
const AFTER = /(에 관한|를 주제로|을 주제로|에 대한)/

/**
 * 보고서 문항에서 주제만. 못 찾으면 null.
 * @param question 서술형(원고지) 문항의 지문
 */
export function examTopic(question: string | null | undefined): string | null {
  const s = String(question ?? '')
  if (!s) return null

  const hits = [...s.matchAll(QUOTED)]
  if (!hits.length) return null

  // '~에 관한 보고서'·'~를 주제로' 바로 앞의 따옴표를 먼저 고른다.
  for (const m of hits) {
    const after = s.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 12)
    if (AFTER.test(after)) return m[1].trim()
  }
  // 못 고르면 가장 긴 따옴표를 쓴다 — 자료 이름보다 주제가 길다.
  return hits.map(m => m[1].trim()).sort((a, b) => b.length - a.length)[0] ?? null
}
