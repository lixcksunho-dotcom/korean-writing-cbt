// 지금 회원인 사람만 남기는 필터 — 결제 리포트들이 같은 규칙을 쓰게 한 곳에 둔다.
//
// 왜 필요한가: 포트원 원장에는 탈퇴한 사람과 검증 스크립트가 만든 계정의 결제 시도도 남는다.
// 그걸 그대로 세면 '결제창까지 왔는데 안 낸 사람'이 부풀고(8/23 "진입 2건 → 시도 0건"은
// 회원 목록에 없는 검증 계정 2건이었다 — REPORT 8/28), 정작 연락할 수 있는 사람 수가 흐려진다.
// 관리자 화면도 같은 규칙으로 센다.

/** Supabase auth 의 현재 회원 id 집합. 서비스 키로만 읽는다(개인정보는 id 만 쓴다). */
export async function fetchMemberIds(ENV) {
  // per_page 상한은 1000 — 회원이 그 이상이면 뒤가 잘린다. check:row-cap 이 80% 에서 경고한다.
  const res = await fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: { apikey: ENV.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  return new Set(((await res.json())?.users ?? []).map((u) => u.id))
}

/** 포트원 결제건 목록을 회원/비회원으로 가른다. 반환: { kept, dropped } */
export function splitByMembership(items, memberIds) {
  const idOf = (p) => p.customer?.id ?? p.customer?.customerId ?? ''
  const kept = items.filter((p) => memberIds.has(idOf(p)))
  const dropped = items.filter((p) => !memberIds.has(idOf(p)))
  return { kept, dropped }
}
