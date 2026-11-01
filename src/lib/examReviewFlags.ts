// 시험 도중 '다시 볼 문항' 표시를 브라우저에 보관한다.
//
// 실제 CBT(국가시험·comcbt 등)에는 답을 고르고도 확신이 없는 문항에 표시를 남겨
// 제출 전에 돌아오는 단추가 있다. 우리 화면은 '완료/미완료'만 구분해서, 39문항을
// 풀다 "아까 헷갈린 게 몇 번이었지"를 머릿속으로 들고 다녀야 했다.
//
// 답안 초안(examDraft)과 키를 따로 둔다 — 초안 복구 배너·마감 시각 계산과 얽히지
// 않게 하고, 표시만 날아가도 답은 남게 한다.

const KEY = (sessionId: string) => `kptest_exam_flags_${sessionId}`

/** getSnapshot에 그대로 쓸 수 있게 원문 문자열을 돌려준다(매번 새 배열을 만들면 무한 렌더). */
export function readFlagsRaw(sessionId: string): string | null {
  try {
    return localStorage.getItem(KEY(sessionId))
  } catch {
    return null
  }
}

/** 깨진 값·옛 형식은 조용히 빈 목록으로 — 표시는 보조 정보라 시험을 막으면 안 된다. */
export function parseFlags(raw: string | null): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0))]
  } catch {
    return []
  }
}

/** 순수 함수 — 있으면 빼고 없으면 넣는다. 순서는 처음 표시한 차례를 유지한다. */
export function toggleFlag(flags: readonly string[], questionId: string): string[] {
  return flags.includes(questionId) ? flags.filter(id => id !== questionId) : [...flags, questionId]
}

export function saveFlags(sessionId: string, flags: readonly string[]): void {
  try {
    if (flags.length === 0) localStorage.removeItem(KEY(sessionId))
    else localStorage.setItem(KEY(sessionId), JSON.stringify(flags))
  } catch {
    // 용량 초과·사생활 보호 모드 — 표시를 못 남겨도 시험은 계속돼야 한다
  }
}

export function clearFlags(sessionId: string): void {
  try {
    localStorage.removeItem(KEY(sessionId))
  } catch {
    /* noop */
  }
}
