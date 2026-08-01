-- =============================================
-- 보안 수정: 문제은행 공개 유출 차단
-- Supabase SQL Editor에서 실행하세요. 선행: 001_cbt.sql
--
-- 기존 정책은 questions 전체에 대해 FOR SELECT USING (true) 였다.
-- anon 키는 클라이언트 번들에 들어가는 공개값이므로, 로그인조차 없이
-- 누구나 REST로 전 문항의 correct_answer·explanation 까지 통째로 내려받을 수 있었다.
--   (실측: anon 키로 /rest/v1/questions 767행 응답, 정답·해설 포함)
-- 이 서비스가 파는 것이 바로 그 콘텐츠이므로 공개 SELECT 자체를 없앤다.
--
-- questions는 사용자별 행이 아니라 전 사용자가 공유하는 자산이라
-- "본인 행만" 식으로 좁힐 수가 없다 → service_role 로만 읽는다.
-- 앱 코드는 이미 src/lib/questionBank.ts (service_role) 를 통해서만 읽도록 바꿨고,
-- questions를 읽는 곳은 전부 서버(서버 컴포넌트·서버 액션)다.
--
-- 적용 순서: 코드 배포 → 이 SQL 실행. (반대로 하면 문제/연습 화면이 잠깐 빈다)
-- =============================================

DROP POLICY IF EXISTS "questions_select" ON public.questions;

-- RLS는 계속 켜 둔 상태이며, 정책이 하나도 없으므로 anon·authenticated 는 전부 거부된다.
-- service_role 은 RLS를 우회하므로 서버 읽기는 그대로 동작한다.
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 확인용(선택): 아래가 0행이어야 한다.
--   SELECT policyname FROM pg_policies WHERE tablename = 'questions';
