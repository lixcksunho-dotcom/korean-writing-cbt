-- =============================================
-- Phase 3: 원고지 AI 채점 테이블
-- Supabase SQL Editor에서 실행하세요
-- =============================================

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

CREATE POLICY "manuscript_select" ON public.manuscript_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "manuscript_insert" ON public.manuscript_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
