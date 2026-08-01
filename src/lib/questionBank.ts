import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 문제은행(questions) 전용 읽기 클라이언트 — **서버에서만** 쓴다.
 *
 * questions는 사용자별 행이 아니라 전 사용자가 공유하는 콘텐츠 자산이고,
 * correct_answer·explanation은 이 서비스가 파는 것 자체다. 그래서 anon 키로
 * 읽히면 안 되고(anon 키는 클라이언트 번들에 들어가는 공개값), RLS도
 * "본인 행만" 같은 걸로 좁힐 수가 없다 → 정책으로 공개 SELECT를 없애고
 * service_role로만 읽는다(마이그레이션 033).
 *
 * RLS를 우회하므로, 호출부는 접근 권한(세션 소유·회차 잠금·구독)을 스스로
 * 확인해야 한다. questions 자체엔 사용자 귀속이 없어 이 클라이언트로 읽는 것은
 * 권한 판단이 아니라 '콘텐츠를 서버 안에 가둬 두는' 목적이다.
 */
export function questionBank() {
  return createAdminClient()
}
