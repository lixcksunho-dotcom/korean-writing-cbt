// 원문자(괄호 안 한글) 라벨 — 한국실용글쓰기 서술형 지문/조건에서 ㉠㉡㉢… 으로 구분 표시된다.
// CBT 답안 입력 시 키보드로 치기 어려우므로, 문제에 나온 라벨을 버튼으로 만들어 클릭 삽입한다.

// 자음 라벨 ㉠~㉭ (U+3260~U+326D) + 가나다 라벨 ㉮~㉻ (U+326E~U+327B)
export const CIRCLED_HANGUL: string[] = Array.from({ length: 0x327C - 0x3260 }, (_, i) =>
  String.fromCharCode(0x3260 + i),
)

const CIRCLED_RE = /[㉠-㉿]/g

// 텍스트(문제 + 지문)에 실제 등장한 원문자 라벨을, 처음 나온 순서대로 중복 없이 추출한다.
export function extractCircledLabels(...texts: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of texts) {
    for (const m of (t ?? '').match(CIRCLED_RE) ?? []) {
      if (!seen.has(m)) {
        seen.add(m)
        out.push(m)
      }
    }
  }
  // 원문자 코드포인트 순으로 정렬(㉠㉡㉢… 보기 좋게) — 등장 순서 대신 자연 순서가 답안 작성에 직관적
  return out.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0))
}

// textarea/input 에 현재 커서 위치로 문자열을 삽입하고 커서를 그 뒤로 옮긴다(제어 컴포넌트용).
export function insertAtTextareaCursor(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  current: string,
  setValue: (v: string) => void,
  insert: string,
) {
  const start = el?.selectionStart ?? current.length
  const end = el?.selectionEnd ?? current.length
  const next = current.slice(0, start) + insert + current.slice(end)
  setValue(next)
  // onChange 반영 후 커서 복원
  requestAnimationFrame(() => {
    if (!el) return
    const pos = start + insert.length
    el.focus()
    try {
      el.setSelectionRange(pos, pos)
    } catch {
      /* input type이 setSelectionRange 미지원이면 무시 */
    }
  })
}
