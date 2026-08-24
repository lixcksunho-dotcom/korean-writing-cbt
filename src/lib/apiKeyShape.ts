// 환경변수에 들어온 API 키의 '모양'을 본다(순수 — 네트워크 없음).
//
// 왜 필요한가: 프로덕션에서 AI 채점 키 점검이 두 번 다 '연결 실패'로 떨어졌다. 그런데 같은
// 키가 로컬에서는 0.3초에 200을 준다. 서버가 Anthropic에 아예 못 나가는 것일 수도 있지만,
// **키 값에 따옴표나 개행이 섞여 있으면 fetch가 요청을 보내기도 전에 예외로 죽는다** —
// 그 예외는 '연결 실패'와 구분되지 않는다. 값을 눈으로 볼 수 없는 곳(Vercel)에 있을수록
// 이 구분이 중요하다.
//   npm run check:keyshape

export type KeyShape = { ok: true } | { ok: false; problem: string }

/** 키 자체는 절대 돌려주지 않는다 — 무엇이 잘못됐는지만 말한다. */
export function describeKeyShape(raw: string | undefined, expectedPrefix?: string): KeyShape {
  if (!raw) return { ok: false, problem: '값이 없습니다' }
  if (/[\r\n]/.test(raw)) return { ok: false, problem: '값에 줄바꿈이 섞여 있습니다 — 복사할 때 따라 들어온 것으로 보입니다' }
  if (raw !== raw.trim()) return { ok: false, problem: '값 앞뒤에 공백이 있습니다' }
  if (/^["']|["']$/.test(raw)) return { ok: false, problem: '값이 따옴표로 감싸여 있습니다 — 환경변수에는 따옴표 없이 넣습니다' }
  if (expectedPrefix && !raw.startsWith(expectedPrefix)) {
    return { ok: false, problem: `값이 '${expectedPrefix}'로 시작하지 않습니다 — 다른 키가 들어갔을 수 있습니다` }
  }
  return { ok: true }
}
