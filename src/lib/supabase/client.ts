import { createBrowserClient } from "@supabase/ssr";
import { SB_URL, SB_ANON } from "./sanitize";

export function createClient() {
  // BOM/제어문자가 제거된 안전한 env 값 사용 (ByteString 헤더 오류 방지)
  return createBrowserClient(SB_URL, SB_ANON);
}
