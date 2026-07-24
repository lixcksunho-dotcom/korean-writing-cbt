-- =============================================
-- 다중 시험(프로그램) 지원: questions/quiz_sessions 에 program 축 추가
-- 한국실용글쓰기(silyong) + KBS한국어능력시험(kbs)을 한 플랫폼에서 서비스하기 위함.
-- 기존 데이터는 전부 'silyong' 으로 백필(컬럼 DEFAULT). 동작 변화 없음.
-- ⚠️ DDL 이므로 Supabase SQL Editor 에서 실행하세요.
-- =============================================

-- 1) program 컬럼 추가 (기존 행은 DEFAULT 로 자동 'silyong')
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS program text NOT NULL DEFAULT 'silyong';

ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS program text NOT NULL DEFAULT 'silyong';

-- 2) 값 무결성 (신규 시험 추가 시 이 CHECK 를 ALTER 로 확장할 것)
ALTER TABLE public.questions   DROP CONSTRAINT IF EXISTS questions_program_check;
ALTER TABLE public.questions   ADD  CONSTRAINT questions_program_check   CHECK (program IN ('silyong','kbs'));
ALTER TABLE public.quiz_sessions DROP CONSTRAINT IF EXISTS quiz_sessions_program_check;
ALTER TABLE public.quiz_sessions ADD  CONSTRAINT quiz_sessions_program_check CHECK (program IN ('silyong','kbs'));

-- 3) 문항 유니크 키 확장: (year,round,number) -> (program,year,round,number)
--    KBS 와 실용글쓰기가 같은 (year,round) 를 써도 충돌하지 않게.
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_year_round_number_key;
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_program_year_round_number_key;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_program_year_round_number_key UNIQUE (program, year, round, number);

-- 4) 이어풀기(진행중 세션) 인덱스에 program 반영
DROP INDEX IF EXISTS quiz_sessions_inprogress_idx;
CREATE INDEX IF NOT EXISTS quiz_sessions_inprogress_idx
  ON public.quiz_sessions (user_id, program, year, round)
  WHERE completed_at IS NULL;

-- 5) 시험별 문항 조회 필터용 인덱스
CREATE INDEX IF NOT EXISTS questions_program_idx ON public.questions (program);
