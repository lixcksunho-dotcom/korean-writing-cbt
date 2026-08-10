// 로그인 벽에 막히기 전에 가려던 곳을 기억했다가 돌려보낸다.
//
// 보호 화면이 /login?next=… 로 보내고(lib/loginRedirect), 인증 화면이 그 값을 지켜
// 돌려보낸다. 이게 없으면 로그인 후 무조건 /dashboard로 가서, 방금 누른 것과 다른
// 화면이 뜬다. 공개 학습자료 15곳이 "무료 CBT 모의고사"로 /cbt를 가리키는데 그게
// 전부 로그인 벽으로 들어온다 — 유입의 맨 앞에서 의도가 통째로 버려지고 있었다.
//
// 판정은 순수 함수로 두어 서버(proxy)와 브라우저(로그인·가입 화면)가 같은 규칙을 쓴다.
// 한쪽만 고치면 로컬(미들웨어 동작)과 배포(미들웨어 미동작)에서 다르게 움직인다.

// 슬래시 두 개나 역슬래시로 시작하면 브라우저가 외부 주소로 읽는다.
// 그대로 두면 우리 로그인 화면이 남의 사이트로 사람을 튕겨 보내는 통로가 된다.
const EXTERNAL = /^\/[/\\]/
// 인증 화면을 가리키면 되돌이가 된다(로그인 → /login → 로그인 …).
const AUTH_SCREEN = /^\/(login|signup|forgot-password|reset-password)(\/|\?|$)/

/** 주소창에서 온 값이라 그대로 믿지 않는다. 같은 사이트 안의 일반 경로만 허용한다. */
export function safeNextPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || EXTERNAL.test(raw) || AUTH_SCREEN.test(raw)) return fallback
  return raw
}

/** 브라우저에서 현재 주소의 next를 읽는다. */
export function readNextPath(fallback: string): string {
  try {
    return safeNextPath(new URLSearchParams(window.location.search).get('next'), fallback)
  } catch {
    return fallback
  }
}
