// 로그인 벽에 막히기 전에 가려던 곳을 기억했다가 돌려보낸다.
//
// 미들웨어가 보호 경로를 막을 때 /login?next=… 로 보낸다. 이게 없으면 로그인 후
// 무조건 /dashboard로 가서, 방금 누른 것과 다른 화면이 뜬다. 공개 학습자료 15곳이
// "무료 CBT 모의고사"로 /cbt를 가리키는데 그게 전부 로그인 벽으로 들어온다 —
// 유입의 맨 앞에서 사용자의 의도가 통째로 버려지고 있었다.
//
// 값은 주소창에서 오므로 그대로 믿으면 안 된다. 같은 사이트 안의 경로만 허용한다.
// 슬래시 두 개로 시작하거나 역슬래시가 붙은 형태는 브라우저가 외부 주소로 읽어,
// 우리 로그인 화면을 남의 사이트로 튕겨 보내는 통로가 된다.
const EXTERNAL = /^\/[/\\]/

export function readNextPath(fallback: string): string {
  try {
    const raw = new URLSearchParams(window.location.search).get('next')
    if (!raw) return fallback
    if (!raw.startsWith('/') || EXTERNAL.test(raw)) return fallback
    return raw
  } catch {
    return fallback
  }
}
