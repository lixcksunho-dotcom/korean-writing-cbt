-- =============================================
-- 시험 '저장하고 나가기 / 이어풀기' (유료 전용)
-- quiz_sessions 에 중간 저장 상태를 보관한다.
-- Supabase SQL Editor 에서 실행하세요.
-- =============================================

ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS saved_answers jsonb,         -- 중간 저장된 답안(question_id -> answer)
  ADD COLUMN IF NOT EXISTS time_left     int,           -- 남은 시간(초)
  ADD COLUMN IF NOT EXISTS saved_at      timestamptz;   -- 마지막 저장 시각

-- 이어풀기 조회 최적화: (사용자, 회차) 별 진행중 세션
CREATE INDEX IF NOT EXISTS quiz_sessions_inprogress_idx
  ON public.quiz_sessions (user_id, year, round)
  WHERE completed_at IS NULL;
