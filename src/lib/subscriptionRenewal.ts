// 재결제로 붙잡을 수 있는 사람이 몇 명인지 센다(순수 계산 — DB·네트워크 없음).
//
// 왜 필요한가: 결제한 사람 중 다시 산 사람이 아직 한 명도 없다. 대시보드에 만료 임박·만료
// 배너가 이미 있지만 그건 **다시 들어와야** 보인다 — 끝난 사람은 대개 안 들어온다.
// 그래서 사장님이 직접 챙길 수 있게 아침 보고에 사람 수를 싣는다.
//
// 계산부를 아침 보고(subscriberReport)에서 떼어 둔 이유: 그쪽은 DB를 잡고 있어
// 검사 스크립트에서 못 부른다. 숫자가 맞는지는 화면·DB 없이 확인할 수 있어야 한다.
//   npm run check:renewal

const DAY = 24 * 3600 * 1000

export const EXPIRING_WINDOW_DAYS = 7
export const EXPIRED_WINDOW_DAYS = 30

/**
 * 사람 단위로 센다. 한 사람이 여러 번 결제했으면 **가장 나중 만료일**만 본다 —
 * 결제 건마다 세면 이미 연장한 사람이 '떠난 사람'으로 또 잡힌다.
 */
export function summarizeRenewals(
  rows: { user_id: string; expires_at: string }[],
  now: number,
): { expiringSoon: number; expiredNotBack: number } {
  const latest = new Map<string, number>()
  for (const r of rows) {
    const t = Date.parse(r.expires_at)
    if (!Number.isFinite(t)) continue // 날짜가 깨진 행은 세지 않는다(0으로 읽으면 전원이 만료로 잡힌다)
    const prev = latest.get(r.user_id)
    if (prev === undefined || t > prev) latest.set(r.user_id, t)
  }

  let expiringSoon = 0
  let expiredNotBack = 0
  for (const end of latest.values()) {
    if (end >= now && end < now + EXPIRING_WINDOW_DAYS * DAY) expiringSoon++
    else if (end < now && end >= now - EXPIRED_WINDOW_DAYS * DAY) expiredNotBack++
  }
  return { expiringSoon, expiredNotBack }
}
