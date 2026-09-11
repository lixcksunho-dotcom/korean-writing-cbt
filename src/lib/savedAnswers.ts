export function sanitizeSavedAnswers(raw: unknown): Record<string, string> {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    return Object.fromEntries(Object.entries(raw).filter(([, answer]) => typeof answer === 'string'))
  } catch {
    // 읽을 수 없는 답안 때문에 시험 복구가 중단되면 안 된다.
    return {}
  }
}
