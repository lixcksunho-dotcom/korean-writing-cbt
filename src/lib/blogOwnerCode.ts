// 신청자가 '그 글을 쓴 본인'임을 확인하는 코드.
//
// 왜 필요한가: 글 주소만 받으면 남이 쓴 글을 그대로 내도 통과한다. 검색해서 나온
// 남의 후기를 붙여 넣으면 끝이다. 체험단 서비스들이 쓰는 방법이 이것 — 사람마다
// 다른 짧은 코드를 주고 글 안에 적게 한다. 글을 쓸 수 있는 사람만 코드를 넣을 수 있다.
//
// 계정마다 고정이라 다시 신청할 때 다른 코드를 찾을 필요가 없고, 화면에 늘 같은 값이
// 보인다. 비밀이 아니므로(글에 공개로 적는다) 되돌릴 수 없게 만들 필요는 없지만,
// 남의 코드를 눈으로 유추하지 못할 만큼은 섞는다.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // O/0, I/1 뺀 32자 — 옮겨 적을 때 헷갈린다

/** 계정별 고정 코드. 예: SGP-K7M2QX */
export function blogOwnerCode(userId: string, prefix = 'SGP'): string {
  // FNV-1a 32비트. 암호용이 아니라 '섞기'용이라 이 정도면 충분하고, 순수 함수라
  // 브라우저·서버·검사에서 같은 값이 나온다.
  let h = 0x811c9dc5
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[h % ALPHABET.length]
    h = Math.floor(h / ALPHABET.length) || Math.imul(h ^ (i + 1), 0x01000193) >>> 0
  }
  return `${prefix}-${out}`
}

/** 글 본문에 그 코드가 적혀 있는지. 사람은 공백·줄바꿈을 섞어 적는다. */
export function bodyHasOwnerCode(bodyText: string, code: string): boolean {
  const squash = (s: string) => s.replace(/[\s-]+/g, '').toUpperCase()
  return squash(bodyText).includes(squash(code))
}
