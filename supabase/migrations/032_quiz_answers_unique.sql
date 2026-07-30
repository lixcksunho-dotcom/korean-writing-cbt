-- quiz_answers 중복 방지: 한 세션의 한 문항에는 답안이 1건만 존재해야 한다.
-- 앱은 submitSession에서 completed_at 가드로 재제출을 막지만(주 보호),
-- 동시 제출 같은 드문 경합까지 막기 위한 방어선(DB 레벨 유니크).
-- 중복이 생기면 서술형 AI 채점의 단건 조회(.single())가 깨지고 집계가 이중 계산된다.
--
-- 적용 전 기존 중복이 있으면 제약 추가가 실패하므로, 먼저 중복을 정리한다(최신 1건만 남김).
-- Supabase SQL Editor에서 실행. 선행: 001_cbt.sql

-- 1) 기존 중복 정리(같은 session_id+question_id 중 id가 가장 큰 1건만 유지)
DELETE FROM public.quiz_answers a
USING public.quiz_answers b
WHERE a.session_id = b.session_id
  AND a.question_id = b.question_id
  AND a.id < b.id;

-- 2) 유니크 제약 추가(이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quiz_answers_session_question_uniq'
  ) THEN
    ALTER TABLE public.quiz_answers
      ADD CONSTRAINT quiz_answers_session_question_uniq UNIQUE (session_id, question_id);
  END IF;
END $$;
