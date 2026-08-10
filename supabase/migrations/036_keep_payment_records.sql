-- =============================================
-- 회원을 지워도 결제 기록은 남긴다
-- Supabase SQL Editor에서 실행하세요. 선행 없음.
--
-- 지금: subscriptions.user_id 가 auth.users(id) ON DELETE CASCADE 이고 NOT NULL 이다.
-- 그래서 회원을 삭제하면 **그 사람의 결제 기록도 함께 사라진다.**
--   - 관리자 화면의 누적 매출이 조용히 줄어든다(지운 만큼).
--   - 환불·분쟁이 생겼을 때 근거 자료가 없다.
--   - 전자상거래법은 대금결제 기록을 5년간 보존하도록 요구한다(제6조). 개인정보처리방침도
--     "관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관"이라고 적어 두었는데,
--     실제 동작은 그렇지 않았다.
--
-- 고치는 방법: 사람과의 연결만 끊고 거래 기록은 남긴다. 개인정보 관점에서도 이쪽이 맞다 —
-- 지워야 하는 것은 '누가 샀는지'이지 '거래가 있었다'는 사실이 아니다.
--
-- 적용 후: 회원 삭제 시 그 사람의 subscriptions.user_id 가 NULL 이 되고 행은 남는다.
-- getActiveSubscription 은 user_id 로 조회하므로 NULL 행은 자연히 걸러진다.
-- =============================================

ALTER TABLE public.subscriptions
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 확인용(선택):
--   SELECT conname, confdeltype FROM pg_constraint
--    WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'f';
--   -- confdeltype: 'c'=CASCADE(예전), 'n'=SET NULL(적용 후)
