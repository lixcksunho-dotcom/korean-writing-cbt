-- =============================================
-- 합격 후기 확장: 시험 날짜·시험 점수·점수 인증 사진
-- Supabase SQL Editor 에서 실행하세요.
-- =============================================

-- 1) reviews 컬럼 추가
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS exam_date  date,
  ADD COLUMN IF NOT EXISTS exam_score int,
  ADD COLUMN IF NOT EXISTS proof_path text,        -- Storage(review-proofs) 내 경로(비공개)
  ADD COLUMN IF NOT EXISTS verified   boolean DEFAULT false;  -- 관리자 점수 인증 확인 여부

-- 점수 범위 체크(0~1000, NULL 허용). 재실행 대비 기존 제약 제거 후 추가.
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_exam_score_chk;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_exam_score_chk
  CHECK (exam_score IS NULL OR exam_score BETWEEN 0 AND 1000);

-- 2) 점수 인증 사진용 '비공개' 버킷
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-proofs', 'review-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage 정책: 본인 폴더(첫 경로 세그먼트 = 사용자 id)에만 업로드/조회
--    인증 사진은 개인 점수표라 공개하지 않고, 본인과 service_role(관리자)만 접근.
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
