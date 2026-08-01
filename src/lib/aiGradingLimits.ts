// AI 채점에 들어가는 사용자 입력의 상한.
//
// 채점은 유료 API를 호출하므로 입력 길이가 곧 비용이다. 서버 액션은 브라우저에서
// 직접 호출할 수 있어서, 상한이 없으면 누구나 거대한 텍스트를 넣어 요금을 태울 수 있다.
// 실제 답안(원고지 1,600자·서술형 답안)보다 넉넉하지만 남용은 막는 값으로 잡는다.
export const MAX_ANSWER_CHARS = 4000
export const MAX_TOPIC_CHARS = 300

/** 상한을 넘으면 사람이 읽을 수 있는 한국어 메시지로 거절한다(잘라내면 채점 근거가 달라진다). */
export function assertWithinGradingLimit(text: string, max: number, label: string): void {
  if ((text ?? '').length > max) {
    throw new Error(`${label}이(가) 너무 깁니다. ${max.toLocaleString()}자 이내로 줄여 주세요.`)
  }
}
