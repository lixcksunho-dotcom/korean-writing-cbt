-- =============================================
-- 듣기 문항용 오디오 URL 컬럼.
-- KBS 듣기·말하기 영역은 대본을 TTS(edge-tts, 무료 뉴럴 음성)로 만들어
-- Supabase Storage(공개 버킷 question-assets/listening/)에 올리고 그 URL을 저장한다.
-- audio_url이 있는 문항은 시험 화면에서 오디오 플레이어로 재생된다.
-- ⚠️ 선행: 026_multi_program.sql. DDL이므로 Supabase SQL Editor에서 실행.
-- =============================================

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS audio_url text;
