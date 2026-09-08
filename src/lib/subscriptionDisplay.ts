// 이용권을 화면에 어떻게 보여 줄지 — 순수 함수만. import 가 없어 브라우저 번들·검사 스크립트에서도 읽는다.
// (subscription.ts 는 서버 전용 supabase 클라이언트를 물고 있어 node 검사에서 직접 못 부른다.)

/** 남은 날. 오늘 만료면 0. */
export function daysUntilExpiry(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400_000)
}

/** 결제 건이 현재 시점 기준 유효(이용 중)한지 */
export function isActivePass(status: string, expiresAt: string): boolean {
  return status === 'active' && new Date(expiresAt).getTime() >= Date.now()
}

/** 이용권 전체 기간(일). 7일짜리 후기 이용권과 30일 결제 이용권을 구분하는 데 쓴다. */
export function passDays(startedAt: string, expiresAt: string): number {
  return Math.max(1, Math.round((new Date(expiresAt).getTime() - new Date(startedAt).getTime()) / 86400_000))
}

/**
 * 만료가 임박했는가 — 남은 기간이 전체의 4분의 1 이하(최소 2일)일 때.
 *
 * 예전엔 '남은 7일 이하'로만 봤다. 그런데 블로그 후기 이용권이 7일짜리라 **받는 순간**
 * "이용권이 7일 뒤 만료돼요 · 지금 연장하세요" 배너가 떴다(2026-09-08 실제 지급으로 확인).
 * 기간에 비례하게 보면 30일권은 8일 이하, 7일권은 2일 이하에서 뜬다.
 */
export function isExpiringSoon(sub: { started_at: string; expires_at: string }): boolean {
  const total = passDays(sub.started_at, sub.expires_at)
  return daysUntilExpiry(sub.expires_at) <= Math.max(2, Math.ceil(total / 4))
}

/**
 * 이용권 이름 — 실제 기간과 발급 경로를 그대로 적는다.
 *
 * 예전엔 "AI 채점 30일 이용권"이 글자로 박혀 있어, 7일짜리 후기 이용권도 30일이라고 말했다
 * (2026-09-08 실제 지급 화면에서 확인). 화면이 사실과 다르면 그 자체가 분쟁거리다.
 */
export function passLabel(sub: { payment_key?: string | null; amount?: number | null; started_at: string; expires_at: string }): string {
  const days = passDays(sub.started_at, sub.expires_at)
  const key = sub.payment_key ?? ''
  if (key.startsWith('promo:blog-review')) return `블로그 후기 이용권 ${days}일`
  if (key.startsWith('promo:')) return `행사 이용권 ${days}일`
  if (key.startsWith('admin-grant')) return `관리자 지급 이용권 ${days}일`
  if (!Number(sub.amount)) return `무료 이용권 ${days}일`
  return `프리미엄 플랜 ${days}일 이용권`
}
