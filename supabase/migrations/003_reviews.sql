-- =============================================
-- 합격 후기 테이블
-- Supabase SQL Editor에서 실행하세요
-- =============================================

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

-- 누구나 공개 후기 읽기 가능
CREATE POLICY "reviews_select" ON public.reviews
  FOR SELECT USING (is_visible = true);

-- 로그인 사용자만 작성
CREATE POLICY "reviews_insert" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인 글만 삭제
CREATE POLICY "reviews_delete" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);
