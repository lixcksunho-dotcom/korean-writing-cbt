-- =============================================
-- 보안 수정: 구독 자가 발급 차단
-- Supabase SQL Editor에서 실행하세요
--
-- 기존 정책은 auth.uid() = user_id 이면 사용자가 직접 subscriptions에
-- INSERT/UPDATE 할 수 있었음 → 브라우저에서 결제 없이 status='active' 행을
-- 만들어 구독을 자가 발급하는 것이 가능했음.
--
-- 구독은 결제 검증을 거친 서버(Service Role)만 기록해야 하므로
-- 사용자에게는 SELECT(본인 구독 조회)만 남기고 INSERT/UPDATE 정책을 제거한다.
-- Service Role은 RLS를 우회하므로 결제 성공 시 정상 발급된다.
-- =============================================

DROP POLICY IF EXISTS "sub_insert" ON public.subscriptions;
DROP POLICY IF EXISTS "sub_update" ON public.subscriptions;

-- sub_select(본인 구독 조회)는 그대로 유지
