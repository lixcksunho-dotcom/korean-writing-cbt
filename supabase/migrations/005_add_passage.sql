-- passage(지문) 컬럼 추가, essay(서술형) 타입 추가
-- Supabase SQL Editor에서 실행하세요

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS passage text;

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_type_check
  CHECK (type IN ('multiple', 'short', 'essay'));
