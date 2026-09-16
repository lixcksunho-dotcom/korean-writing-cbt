// 사후 확인이 볼 신청을 고른다.
//
// 자동 지급은 계정당 한 번(order_id = review-auto-<user>)이라, 그 사람의 신청이 여럿이면
// 지급된 것은 **가장 최근 신청**뿐이다. 앞선 신청까지 보면 "조건 미달 → 글 지우고 다시 신청"한
// 사람의 지워진 첫 글이 3시간마다 '못 읽음(404)'으로 올라온다(2026-09-15 실제).
export type AuditCandidate = { id: string; user_id: string | null; contact: string | null; created_at: string }

export function pickAuditRows<T extends AuditCandidate>(candidates: T[], granted: Set<string>): T[] {
  const sorted = [...candidates].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  const autoSeen = new Set<string>()
  return sorted.filter(r => {
    if (granted.has(`review-${r.id}`)) return true
    if (!r.user_id || !granted.has(`review-auto-${r.user_id}`)) return false
    if (autoSeen.has(r.user_id)) return false
    autoSeen.add(r.user_id)
    return true
  })
}
