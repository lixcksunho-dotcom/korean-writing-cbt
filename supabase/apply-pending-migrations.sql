-- =====================================================================
-- 운영 DB에 아직 적용되지 않은 것 모음 — SQL Editor에 통째로 붙여넣고 Run 한 번.
--   https://supabase.com/dashboard/project/itzhfbsbwuoedncnjhzt/sql/new
--
-- 셋 다 재실행해도 안전하다(IF NOT EXISTS / 조건부 생성).
-- 각 항목의 자세한 배경은 원본 마이그레이션 파일 주석에 있다.
--
--   1) 002_manuscript.sql            ← 지금 원고지 AI 첨삭 결과가 저장되지 않고 있다
--   2) 032_quiz_answers_unique.sql   ← 동시 제출 경합 방어선
--   3) 034_reviews_hide_private_columns.sql ← 후기 받기 시작하기 전에
--
-- 적용 후 확인: python scripts/schema_drift_check.py  → "불일치 없음 ✓"
-- =====================================================================


-- =====================================================================
-- 1) 원고지 AI 첨삭 저장 테이블 (002) — 가장 급함
--
-- 이 테이블이 운영 DB에 없다(PostgREST 노출 목록에 없음 = 만들어진 적 없음).
-- 그래서 gradeManuscript가 채점을 마치고 insert 할 때마다 실패하는데,
-- supabase-js는 throw 대신 {error}를 돌려주고 코드가 그걸 안 봐서 조용히 넘어갔다.
-- 읽는 쪽(첨삭 기록·대시보드 횟수)도 `?? []`라 화면은 "0건"으로 멀쩡해 보였다.
-- => 사용자는 이용권/무료 체험을 차감당하고 Anthropic 요금도 나간 뒤에 기록만 잃었다.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.manuscript_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic text NOT NULL,
  content text NOT NULL,
  score int,
  feedback jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.manuscript_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manuscript_select" ON public.manuscript_submissions;
DROP POLICY IF EXISTS "manuscript_insert" ON public.manuscript_submissions;

CREATE POLICY "manuscript_select" ON public.manuscript_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "manuscript_insert" ON public.manuscript_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인 기록 조회는 user_id로만 훑는다.
CREATE INDEX IF NOT EXISTS manuscript_submissions_user_idx
  ON public.manuscript_submissions (user_id, created_at DESC);


-- =====================================================================
-- 2) quiz_answers 중복 방지 (032)
-- 한 세션의 한 문항에 답안은 1건이어야 한다. 중복이 생기면 서술형 AI 채점의
-- .single() 조회가 깨지고 집계가 이중 계산된다. (현재 중복 0건 — DELETE는 무동작)
-- =====================================================================
DELETE FROM public.quiz_answers a
USING public.quiz_answers b
WHERE a.session_id = b.session_id
  AND a.question_id = b.question_id
  AND a.id < b.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quiz_answers_session_question_uniq'
  ) THEN
    ALTER TABLE public.quiz_answers
      ADD CONSTRAINT quiz_answers_session_question_uniq UNIQUE (session_id, question_id);
  END IF;
END $$;


-- =====================================================================
-- 3) 공개 후기에서 계정 식별자·인증 파일 경로 가리기 (034)
-- reviews의 공개 정책은 `USING (is_visible = true)`라 행만 고르고 열은 못 고른다.
-- 즉 후기를 공개하는 순간 user_id·proof_path·exam_date까지 anon 키로 읽힌다.
-- 지금은 공개 후기가 0건이라 새는 값이 없다 — 받기 시작하기 전에 적용한다.
-- =====================================================================
REVOKE SELECT ON public.reviews FROM anon, authenticated;

GRANT SELECT (
  id, display_name, content, rating, exam_score, verified, is_visible, created_at
) ON public.reviews TO anon, authenticated;
