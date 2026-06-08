// 문항 지문/조건에서 글자 수 제한을 파싱한다.
// 예) "800자 내외" → 800, "180자 이내" → 180, "150자 이상 200자 이하" → 200(최댓값)
export function parseCharLimit(text: string | null | undefined): number | null {
  const matches = [...(text ?? '').matchAll(/([0-9][0-9,]*)\s*자/g)]
    .map(m => parseInt(m[1].replace(/,/g, ''), 10))
    .filter(n => Number.isFinite(n) && n >= 20 && n <= 5000)
  if (!matches.length) return null
  return Math.max(...matches)
}

// 제한 글자수에 맞춘 원고지 행 수(20% 여유 + 1행). 제한이 없으면 fallback.
export function manuscriptRows(limit: number | null, cols: number, fallback = 42): number {
  if (!limit) return fallback
  const rows = Math.ceil((limit * 1.2) / cols) + 1
  return Math.max(6, Math.min(60, rows))
}
