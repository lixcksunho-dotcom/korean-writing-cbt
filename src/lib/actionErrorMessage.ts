// 서버 액션이 '던진' 오류를 화면에 띄울 문장으로 바꾼다.
//
// 두 가지가 겹쳐 있다.
//  1) Next.js 운영 빌드는 서버 액션이 던진 Error의 message를 지운다. 우리가 쓴
//     한국어 안내는 도착하지 않고, 대신 "An error occurred in the Server Components
//     render…" 같은 영문이 온다.
//  2) 회선이 끊기면 브라우저가 "Failed to fetch"를 던진다.
// 둘 다 그대로 보여 주면 무슨 일인지도, 뭘 해야 하는지도 알 수 없다.
// (실측: 문제 오류 신고 화면이 그 영문을 그대로 띄우고 있었다.)
//
// 그래서 '한국어가 들어 있으면 그대로, 아니면 우리가 준비한 문장'으로 고른다.
// 개발 중에는 우리 메시지가 그대로 오므로 그때는 진짜 사유가 보인다.
//
// 새로 만드는 액션은 던지지 말고 값으로 돌려주는 편이 낫다(aiGradingMessage 참고).
// 이 함수는 이미 던지고 있는 자리를 안전하게 감싸는 용도다.
export function readableActionError(e: unknown, fallback: string): string {
  const raw = e instanceof Error ? e.message : ''
  return /[가-힣]/.test(raw) ? raw : fallback
}
