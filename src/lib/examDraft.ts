// 시험 도중 작성한 답안을 브라우저에 임시 보관한다.
//
// 서버 저장('저장하고 나가기')은 유료 기능이라, 무료 사용자는 39문항을 풀다 탭이
// 닫히거나 전화가 오면 전부 잃었다(실측: 세션 87건 중 완료 28건).
// 여기서 주는 건 '사고 복구'지 '일시정지'가 아니다 — 마감 시각을 함께 저장해 자리를
// 비운 동안에도 시험 시계는 계속 흐르게 한다. 시계를 멈추는 건 유료 기능 그대로다.

const KEY = (sessionId: string) => `kptest_exam_draft_${sessionId}`

// deadline은 시간 제한이 있는 모의고사에서만 쓴다. 유형별 연습은 타이머가 없어 null이다.
export type ExamDraft = { answers: Record<string, string>; deadline: number | null }

/** getSnapshot에 그대로 쓸 수 있게 원문 문자열을 돌려준다(매번 새 객체를 만들면 무한 렌더). */
export function readDraftRaw(sessionId: string): string | null {
  try {
    return localStorage.getItem(KEY(sessionId))
  } catch {
    return null
  }
}

export function parseDraft(raw: string | null): ExamDraft | null {
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as ExamDraft
    if (!d || typeof d.answers !== 'object' || d.answers === null) return null
    // 내용 없는 초안은 복구 배너를 띄울 이유가 없다.
    return Object.keys(d.answers).length > 0 ? d : null
  } catch {
    return null
  }
}

export function saveDraft(sessionId: string, answers: Record<string, string>, deadline: number | null): void {
  try {
    localStorage.setItem(KEY(sessionId), JSON.stringify({ answers, deadline }))
  } catch {
    // 용량 초과·사생활 보호 모드 — 저장 못 해도 시험 자체는 계속돼야 한다
  }
}

export function clearDraft(sessionId: string): void {
  try {
    localStorage.removeItem(KEY(sessionId))
  } catch {
    /* noop */
  }
}
