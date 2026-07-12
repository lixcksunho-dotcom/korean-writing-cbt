// 문항 지문/조건에서 글자 수 제한을 파싱한다.
// 예) "800자 내외" → 800, "180자 이내" → 180, "150자 이상 200자 이하" → 200(최댓값)
//
// ⚠️ 다항(원문자 라벨별) 제한 처리:
//   "㉠ 40자, ㉡ 60자, ㉢ 60자 이내로 쓸 것" 처럼 ㉠㉡㉢… 라벨마다 각각 분량이 정해진
//   문항은, 답안 칸 하나에 세 부분을 모두 적으므로 전체 허용량은 '합'(40+60+60=160)이다.
//   과거에는 Math.max로 60만 잡혀 160자 문항이 60자에서 막히는 버그가 있었다.
//   → 라벨이 바로 앞에 붙은 분량이 2개 이상이면 '합'을, 아니면 기존대로 '최댓값'을 쓴다.

// 원문자(괄호 안 한글) 라벨: ㉠(U+3260)~㉿(U+327F) — ㉠~㉭(자음), ㉮~㉻(가나다…)
// 라벨별 분량: "㉠ 40자", "㉡ 60자" … (라벨 → (공백) → 숫자 → 자)
const LABELED_LIMIT_RE = /[㉠-㉿]\s*([0-9][0-9,]*)\s*자/g

export function parseCharLimit(text: string | null | undefined): number | null {
  const s = text ?? ''

  // 1) 라벨별 분량이 2개 이상이면 '합'을 전체 허용량으로 (㉠40+㉡60+㉢60=160)
  const labeled = [...s.matchAll(LABELED_LIMIT_RE)]
    .map(m => parseInt(m[1].replace(/,/g, ''), 10))
    .filter(n => Number.isFinite(n) && n >= 1 && n <= 5000)
  if (labeled.length >= 2) {
    const sum = labeled.reduce((a, b) => a + b, 0)
    if (sum >= 20 && sum <= 5000) return sum
  }

  // 2) 일반(단일/범위): 모든 "N자" 중 최댓값
  const matches = [...s.matchAll(/([0-9][0-9,]*)\s*자/g)]
    .map(m => parseInt(m[1].replace(/,/g, ''), 10))
    .filter(n => Number.isFinite(n) && n >= 20 && n <= 5000)
  if (!matches.length) return null
  return Math.max(...matches)
}

// 입력 글자수를 제한에 맞춰 잘라낸다 — '쓸 수 있는 최대 = 문제 제한'을 보장(하드 캡).
// 카운터(`Array.from(v).filter(c => c !== '\n').length`)와 동일 기준: 줄바꿈은 세지 않는다.
// 제한 도달 후의 글자는 버려 더 못 쓰게 한다(줄바꿈은 단락 구분용으로 허용).
export function clampToCharLimit(value: string, limit: number | null): string {
  if (limit == null) return value
  const chars = Array.from(value)
  let count = 0
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== '\n') {
      count++
      if (count > limit) return chars.slice(0, i).join('')
    }
  }
  return value
}

// 제한 글자수에 맞춘 원고지 행 수(20% 여유 + 1행). 제한이 없으면 fallback.
export function manuscriptRows(limit: number | null, cols: number, fallback = 42): number {
  if (!limit) return fallback
  const rows = Math.ceil((limit * 1.2) / cols) + 1
  return Math.max(6, Math.min(60, rows))
}
