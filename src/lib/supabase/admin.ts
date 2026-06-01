import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service Role 클라이언트 — RLS를 우회하므로 절대 클라이언트로 노출 금지.
 * 서버에서 결제 검증 후 구독을 발급하는 등, 사용자가 직접 만들면 안 되는
 * 쓰기 작업에만 사용한다.
 *
 * SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요하다
 * (Supabase 대시보드 → Project Settings → API → service_role key).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. 결제/구독 발급에 필요합니다."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
