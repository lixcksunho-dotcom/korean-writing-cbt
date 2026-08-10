// AI 채점 실패를 화면까지 전달하는 방법.
//
// 던지면 안 된다. Next.js 운영 빌드는 서버 액션이 던진 Error의 message를 지우고
// digest만 남긴다 — 로컬 운영빌드로 확인했다: 서버 로그에는
//   ⨯ Error: AI 채점 서버에 연결하지 못했어요. …  digest: '3224320827'
// 가 찍히는데 브라우저에는 그 문장이 오지 않는다. 그래서 어제 만든 상세 문구
// (잔액 소진·응답 잘림·재시도 가능 여부)가 사용자에게 하나도 닿지 않았고,
// 화면은 늘 "오류가 발생했습니다" 한 줄이었다. 7월에 실패한 두 사람이 본 것도 그것이다.
//
// 그래서 실패는 **값으로 돌려준다**. 값은 지워지지 않는다.

export const SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED'

/** 채점 액션이 실패를 돌려줄 때 쓰는 모양. 성공 타입과 겹치지 않게 error 한 칸만 둔다. */
export type GradingError = { error: string }

export function isGradingError(v: unknown): v is GradingError {
  return typeof v === 'object' && v !== null && typeof (v as GradingError).error === 'string'
}

/** 실패 값을 화면 문구로. 체험 소진은 화면마다 안내가 달라 신호만 돌려준다. */
export function gradingErrorText(e: GradingError, fallback: string): string {
  return e.error === SUBSCRIPTION_REQUIRED ? SUBSCRIPTION_REQUIRED : (e.error || fallback)
}
