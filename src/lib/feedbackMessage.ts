// 불편사항 접수 내용이 받을 만한 것인지 판정한다(순수 — 네트워크·DB 없음).
//
// 창구를 열면 빈 글·오타 한 글자·자동 프로그램의 도배가 같이 들어온다. 그걸 그대로 쌓으면
// 정작 읽어야 할 말이 묻힌다. 반대로 너무 깐깐하면 진짜 불편한 사람이 말을 못 한다.
//   npm run check:feedback

/**
 * 한 글자는 막고 두 글자부터 받는다.
 * 처음엔 4자로 잡았는데 검사에서 '느려요'·'안돼요'(각 3자)가 막혔다 — 실제로 가장 흔한
 * 불평이 그 길이다. 짧다고 버리면 정작 급한 신호를 버린다.
 */
export const MIN_LENGTH = 2
/** 이보다 길면 저장 전에 자른다. 잘렸다는 사실은 접수자에게 알린다. */
export const MAX_LENGTH = 2000
export const MAX_CONTACT = 120

export type FeedbackVerdict =
  | { ok: true; message: string; truncated: boolean }
  | { ok: false; reason: 'empty' | 'too_short' }

export function judgeFeedback(raw: unknown): FeedbackVerdict {
  if (typeof raw !== 'string') return { ok: false, reason: 'empty' }
  // 공백만 있는 글은 빈 글이다. 줄바꿈·전각 공백까지 지운다.
  const message = raw.replace(/\u3000/g, ' ').trim()
  if (!message) return { ok: false, reason: 'empty' }
  if (message.length < MIN_LENGTH) return { ok: false, reason: 'too_short' }
  return {
    ok: true,
    message: message.slice(0, MAX_LENGTH),
    truncated: message.length > MAX_LENGTH,
  }
}

/** 연락처는 형식을 따지지 않는다 — 메일·전화·카톡 아이디 무엇이든 받는다. 길이만 막는다. */
export function normalizeContact(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim()
  return v ? v.slice(0, MAX_CONTACT) : null
}
