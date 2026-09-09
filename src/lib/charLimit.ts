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

// ⚠️ 단위별('각 문단 200자') 제한 처리:
//   "네 문단으로 작성하시오. (각 문단 200자 안팎)" 은 **문단 하나가** 200자다. 전체는 800자다.
//   이걸 전체 제한으로 잡으면 보고서가 200자에서 잘린다 — 2025-4회 39번에서 실제로 그랬고
//   "원고지가 200자로 제한 걸려 있습니다"라는 문의를 받았다(2026-09-09).
//   → 단위 개수를 셀 수 있으면 곱하고, 못 세면 **제한을 걸지 않는다.**
//     모를 때 작은 값으로 막는 쪽이 훨씬 위험하다: 쓴 글이 소리 없이 잘려 나간다.

/** '각 문단 200자'처럼 단위마다 정해진 분량 */
const PER_UNIT_RE = /(?:각|매)\s*(문단|단락|항목)\s*(?:은|는|당|에)?\s*(?:각각\s*)?([0-9][0-9,]*)\s*자/g
/** '네 문단', '3개 항목'처럼 단위가 몇 개인지 */
const UNIT_COUNT_RE = /([0-9]+|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*(?:개\s*)?(문단|단락|항목)/g
const KO_NUM: Record<string, number> = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10 }
/** 원문자 라벨 범위: '㉠~㉢' */
const LABEL_RANGE_RE = /([㉠-㉿])\s*[~∼\-–]\s*([㉠-㉿])/

/** 지문에 적힌 단위(문단·항목)가 몇 개인지. 못 세면 null. */
function countUnits(s: string, unit: string): number | null {
  const nums: number[] = []
  for (const m of s.matchAll(UNIT_COUNT_RE)) {
    if (m[2] !== unit) continue
    const raw = m[1]
    const n = /^[0-9]+$/.test(raw) ? parseInt(raw, 10) : KO_NUM[raw]
    if (n >= 2 && n <= 20) nums.push(n)
  }
  if (nums.length) return Math.max(...nums)
  // 항목은 보통 ㉠~㉢ 같은 라벨로 준다 — 범위나 나열에서 센다.
  const range = s.match(LABEL_RANGE_RE)
  if (range) {
    const n = range[2].codePointAt(0)! - range[1].codePointAt(0)! + 1
    if (n >= 2 && n <= 20) return n
  }
  const listed = new Set([...s.matchAll(/[㉠-㉿]/g)].map(m => m[0]))
  if (listed.size >= 2 && listed.size <= 20) return listed.size
  return null
}

export function parseCharLimit(text: string | null | undefined): number | null {
  const s = text ?? ''

  // 0) 단위별 제한이 먼저다 — 이걸 못 알아보면 아래 '최댓값' 규칙이 문단 하나 분량으로 막는다.
  const perUnit = [...s.matchAll(PER_UNIT_RE)]
  if (perUnit.length) {
    const unit = perUnit[0][1]
    const per = parseInt(perUnit[0][2].replace(/,/g, ''), 10)
    if (Number.isFinite(per) && per >= 10) {
      const count = countUnits(s, unit)
      const multiplied = count ? per * count : null
      // 전체 분량이 따로 적혀 있으면(예: '800자 내외') 그 값도 후보에 넣는다.
      const whole = [...s.matchAll(/([0-9][0-9,]*)\s*자/g)]
        .map(m => parseInt(m[1].replace(/,/g, ''), 10))
        .filter(n => Number.isFinite(n) && n >= 20 && n <= 5000)
      const best = Math.max(multiplied ?? 0, ...whole, 0)
      // 곱할 개수도 없고 전체 표기도 단위 분량뿐이면 — 제한 없음으로 둔다.
      if (multiplied == null && best <= per) return null
      return best >= 20 && best <= 5000 ? best : null
    }
  }

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

/**
 * 실제로 입력을 막는 지점 — 문제 제한보다 조금 넉넉하게 둔다.
 *
 * 왜 여유를 두는가: 예전에는 문제 제한이 곧 하드 캡이었다. 그래서 "100자 내외"인 문항에서
 * 100자를 넘기는 순간 글자가 버려져, 마침표 하나를 못 찍고 문장이 잘렸다. 실제로 2025-1회
 * 37번(160자)에서 12명의 답안이 정확히 160자에서 멈췄고, 그중에는 '설치 비'처럼 낱말
 * 중간에서 끊긴 것도 있었다(2026-09-09 실측).
 *
 * 시험은 분량 초과를 감점으로 다루지 입력을 막지 않는다. 그래서 화면은 제한을 넘는 순간
 * 빨갛게 '초과'를 보여 주되(ExamPlayer), 입력 자체는 이 여유까지 허용한다.
 * 여유를 넘어서면 그때는 막는다 — 원고지 칸을 벗어나 끝없이 쓰는 것도 답이 아니다.
 */
export function hardCharCap(limit: number | null): number | null {
  if (limit == null) return null
  return Math.ceil(limit * 1.2) + 10
}

// 입력 글자수를 캡에 맞춰 잘라낸다.
// 카운터(`Array.from(v).filter(c => c !== '\n').length`)와 동일 기준: 줄바꿈은 세지 않는다.
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
