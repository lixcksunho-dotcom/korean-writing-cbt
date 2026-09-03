// 사고 알림을 세 갈래로 가른다.
//
// 왜 필요한가: 최근 2주 사고 12건 중 9건이 **검사가 만든 것**이었다.
// example.com/promo-check-…, blog.naver.com/audit<숫자>/… — 전부 자동 검사가 남긴 자국이다.
// 그게 어드민 사고 목록을 채우고 텔레그램까지 울렸다.
//
// 이게 왜 나쁜가: 사고 목록은 '지금 볼 것'이어야 한다. 아홉 개가 가짜면 사람은 목록을
// 안 읽게 되고, 그때 진짜 하나가 묻힌다. 결제 실패 1건을 16일간 몰랐던 적이 있다 —
// 알림이 소용없어지는 방식이 바로 이것이다.
//
// 지우지는 않는다. 검사가 실제로 돌았다는 기록은 그것대로 쓸모가 있다.
// '볼 것'과 '안 봐도 되는 것'을 가르기만 한다.

export type AlertTriage =
  /** 검사가 만든 자국 — 사람이 볼 이유가 없다 */
  | 'test'
  /** 스스로 끝난 일 — 알림이 났을 때는 할 일이 있었지만 지금은 없다 */
  | 'settled'
  /** 사람이 봐야 한다 */
  | 'actionable'

/**
 * 검사가 만든 흔적인가.
 *
 * 검사는 늘 자기가 만든 것만 지우고 나가지만, 알림은 '남기는 것'이 목적이라 지우지 않는다.
 * 그래서 주소 모양으로 가른다 — 실제 신청자가 이런 주소를 쓸 일은 없다.
 */
export function isCheckArtifact(text: string): boolean {
  if (!text) return false
  return (
    // 검사가 쓰는 가짜 주소
    /example\.com/i.test(text) ||
    /promo-check-\d{10,}/.test(text) ||
    // 검사가 만드는 계정 이름 규칙: audit/check/probe + 시각
    /blog\.naver\.com\/(audit|check|probe|test)\d{6,}/i.test(text) ||
    /@example\.com/i.test(text) ||
    // 로컬에서 돌린 검사 — 실제 신청자의 글이 내 컴퓨터에 있을 리 없다
    /(localhost|127\.0\.0\.1)(:\d+)?/.test(text) ||
    /(audit|popup|promo|sub|cbt|paid|ui|v|shot|img)\+\d{10,}@/.test(text)
  )
}

/** 그때는 할 일이 있었지만 지금은 없는 알림인가. */
export function isSettled(summary: string): boolean {
  if (!summary) return false
  // 사후 확인이 '아무것도 안 바뀜'으로 끝난 보고 — 볼 것이 없다.
  if (/회수 0건/.test(summary) && /되살림 0건/.test(summary) && /조건 어긋남 0건/.test(summary)) {
    // '못 읽음'만 있는 경우다. 못 읽은 것은 회수하지 않으므로 사람이 할 일이 없고,
    // 진짜로 내려간 글이면 다음 회차에 '회수'로 다시 올라온다.
    return true
  }
  // 배포 직후 조각 오류는 새로고침으로 스스로 복구된다 — 우리 코드가 그렇게 적어 둔다.
  if (/새로고침으로 복구/.test(summary)) return true
  return false
}

export function triageAlert(summary: string, ref?: string | null): AlertTriage {
  const text = `${summary ?? ''} ${ref ?? ''}`
  if (isCheckArtifact(text)) return 'test'
  if (isSettled(summary ?? '')) return 'settled'
  return 'actionable'
}
