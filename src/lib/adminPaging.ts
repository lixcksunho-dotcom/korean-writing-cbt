import type { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'

// 관리자 화면의 페이지 단위 읽기.
//
// PostgREST 는 `.limit(1000)` 을 적어도 1000행에서 조용히 자르고, GoTrue 의 `perPage: 1000` 도
// 마찬가지다. 오류가 없으니 화면 숫자가 틀린 채 아무도 모른다(30일 방문 통계가 그래서
// 며칠치만 나왔었다 — 커밋 b80e086). 목록은 100건씩 이전/다음으로 넘기고, 합계는 전량을
// 페이지 단위로 끝까지 읽어 전체 기준을 지킨다.

type Admin = ReturnType<typeof createAdminClient>

/** 목록 화면 한 페이지 크기 */
export const ADMIN_PAGE_SIZE = 100

/** `?page=` 값을 1 이상의 정수로. 비었거나 이상하면 1. */
export function parsePage(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

export type UsersPage = { users: User[]; total: number; lastPage: number }

/**
 * 회원 목록 한 페이지. 총원은 GoTrue 가 X-Total-Count 로 준다.
 *
 * auth-js 의 `lastPage`/`nextPage` 는 Link 헤더의 page 값 첫 글자만 읽어(`substring(0, 1)`)
 * 10페이지부터 틀린다. 그래서 총원으로 직접 계산한다.
 */
export async function listUsersPage(admin: Admin, page: number, perPage = ADMIN_PAGE_SIZE): Promise<UsersPage> {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
  if (error) throw new Error(error.message)
  const total = Number(data.total) || 0
  return { users: data.users ?? [], total, lastPage: Math.max(1, Math.ceil(total / perPage)) }
}

/** 회원 전체 — 100명씩 끝까지. 검색·회원 대조처럼 전원이 필요할 때만 쓴다. */
export async function listAllUsers(admin: Admin, perPage = ADMIN_PAGE_SIZE): Promise<User[]> {
  const out: User[] = []
  for (let page = 1; ; page++) {
    const { users } = await listUsersPage(admin, page, perPage)
    out.push(...users)
    if (users.length < perPage) break
  }
  return out
}

/**
 * 표 전량 읽기 — `.range()` 로 1000행(PostgREST 한 번의 최대)씩 끝까지.
 * 합계·집계처럼 전체가 필요한 자리에서 `.limit(1000)` 대신 쓴다.
 * @param build from~to 구간을 받아 그 구간의 쿼리를 돌려준다(정렬을 꼭 붙일 것 — 없으면 구간이 흔들린다).
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  chunk = 1000,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += chunk) {
    const { data, error } = await build(from, from + chunk - 1)
    if (error) throw new Error(error.message)
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < chunk) break
  }
  return rows
}
