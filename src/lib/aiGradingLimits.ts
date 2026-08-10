// AI 채점에 들어가는 사용자 입력의 상한.
//
// 채점은 유료 API를 호출하므로 입력 길이가 곧 비용이다. 서버 액션은 브라우저에서
// 직접 호출할 수 있어서, 상한이 없으면 누구나 거대한 텍스트를 넣어 요금을 태울 수 있다.
// 실제 답안(원고지 1,600자·서술형 답안)보다 넉넉하지만 남용은 막는 값으로 잡는다.
export const MAX_ANSWER_CHARS = 4000
export const MAX_TOPIC_CHARS = 300

/**
 * 상한을 넘으면 사유를 돌려준다(넘지 않으면 null). 잘라내지 않는다 — 잘라내면 채점 근거가 달라진다.
 *
 * 던지지 않는 이유: Next.js 운영 빌드는 서버 액션이 던진 Error의 message를 지운다.
 * 그래서 "4,000자 이내로 줄여 주세요"가 사용자에게 닿지 않고 "오류가 발생했습니다"만 떴다.
 */
export function gradingLimitError(text: string, max: number, label: string): string | null {
  if ((text ?? '').length > max) {
    return `${label}이(가) 너무 깁니다. ${max.toLocaleString()}자 이내로 줄여 주세요.`
  }
  return null
}
