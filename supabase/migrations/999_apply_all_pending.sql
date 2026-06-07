-- =====================================================================
-- 미적용 기능 일괄 활성화 (Supabase SQL Editor에 통째로 붙여넣고 Run)
--   1) 합격 후기 테이블(reviews) + 점수인증 확장
--   2) 점수 인증 사진 비공개 버킷(review-proofs) + 정책
--   3) 시험 '저장하고 나가기 / 이어풀기' 컬럼
-- 모두 재실행해도 안전(IF NOT EXISTS / DROP 후 CREATE).
-- =====================================================================

-- ===== 1. 합격 후기 테이블 =====
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 20),
  content text NOT NULL CHECK (char_length(content) BETWEEN 10 AND 150),
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete" ON public.reviews;

CREATE POLICY "reviews_select" ON public.reviews
  FOR SELECT USING (is_visible = true);

CREATE POLICY "reviews_insert" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_delete" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

-- ===== 1-2. 후기 확장 컬럼(시험날짜·점수·인증사진·확인여부) =====
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS exam_date  date,
  ADD COLUMN IF NOT EXISTS exam_score int,
  ADD COLUMN IF NOT EXISTS proof_path text,
  ADD COLUMN IF NOT EXISTS verified   boolean DEFAULT false;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_exam_score_chk;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_exam_score_chk
  CHECK (exam_score IS NULL OR exam_score BETWEEN 0 AND 1000);

-- ===== 2. 점수 인증 사진 비공개 버킷 + 정책 =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-proofs', 'review-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "review_proofs_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "review_proofs_select_own" ON storage.objects;

CREATE POLICY "review_proofs_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "review_proofs_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'review-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== 3. 시험 저장하고 나가기 / 이어풀기 =====
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS saved_answers jsonb,
  ADD COLUMN IF NOT EXISTS time_left     int,
  ADD COLUMN IF NOT EXISTS saved_at      timestamptz;

CREATE INDEX IF NOT EXISTS quiz_sessions_inprogress_idx
  ON public.quiz_sessions (user_id, year, round)
  WHERE completed_at IS NULL;
