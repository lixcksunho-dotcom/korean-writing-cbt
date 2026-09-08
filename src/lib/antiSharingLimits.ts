// 계정 공유 방지 한도 값과, 한도 문구를 알아보는 도우미 — import 가 없어 브라우저 번들에서도 읽는다.
// (antiSharing.ts 는 next/headers·서비스 키를 물고 있어 화면 컴포넌트가 직접 import 하면 안 된다.)

/** 한 계정이 최근 90일 안에 쓸 수 있는 기기 수 */
export const DEVICE_LIMIT = 3
/** 하루 AI 첨삭 상한 — 운영자 결정(2026-09-08): 그대로 두되 걸리면 설명 창을 띄운다 */
export const DAILY_GRADE_LIMIT = 30

/** 서버가 돌려주는 일일 한도 문구의 첫머리. 화면은 이걸로 '한도 창을 띄울 오류'를 가려낸다. */
export const DAILY_LIMIT_MESSAGE_PREFIX = '오늘 AI 첨삭 한도'

export function dailyLimitMessage(): string {
  return `${DAILY_LIMIT_MESSAGE_PREFIX}(${DAILY_GRADE_LIMIT}회)를 모두 사용했어요. 이용권 기간 중 매일 ${DAILY_GRADE_LIMIT}회까지 받을 수 있고, 한국 시간 자정에 다시 열려요.`
}

export function isDailyLimitMessage(msg: string | null | undefined): boolean {
  return typeof msg === 'string' && msg.startsWith(DAILY_LIMIT_MESSAGE_PREFIX)
}
