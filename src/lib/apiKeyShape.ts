// 환경변수에 들어온 API 키의 '모양'을 본다(순수 — 네트워크 없음).
//
// 왜 필요한가: 값을 눈으로 볼 수 없는 곳(Vercel)에 넣은 키는 복사하다 공백·줄바꿈·따옴표가
// 따라 들어가기 쉽다. 그 사실을 화면에 적어 두면 나중에 헤맬 일이 줄어든다.
//
// **주의(실측 2026-08-25): 앞뒤 공백만으로는 호출이 깨지지 않는다.** fetch도 Anthropic SDK도
// 공백이 붙은 키로 200을 받는다. 처음엔 이게 연결 실패의 원인이라고 단정했는데 틀렸다.
// 그래서 이 판정은 **호출을 막는 근거가 아니라 참고 사항**으로만 쓴다 — 실제로 되는지는
// 반드시 호출해 보고 말해야 한다. 따옴표·잘못된 접두사는 인증 실패(401)로 드러난다.
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
