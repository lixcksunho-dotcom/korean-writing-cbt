-- =============================================
-- 개인정보 축소: 공개 후기에서 계정 식별자·인증 파일 경로를 가린다
-- Supabase SQL Editor에서 실행하세요. 선행: 003_reviews.sql, 015_review_proof.sql
--
-- reviews의 공개 정책은 `FOR SELECT USING (is_visible = true)` 라, 공개된 후기의
-- '모든 컬럼'이 anon 키로 읽힌다. 거기엔 화면에 쓰지 않는 것까지 들어 있다:
--   user_id    — 계정 UUID(가입자 식별자)
--   proof_path — 점수 인증 사진의 스토리지 경로(= user_id 폴더명이 그대로 드러남)
--   exam_date  — 응시 날짜
-- 사진 자체는 비공개 버킷(review-proofs)이라 내려받히지 않지만, 경로와 계정 식별자가
-- 함께 공개되는 건 줄이는 게 맞다.
--
-- 지금은 공개 후기가 0건이라 실제로 새는 값은 없다. 후기를 받기 시작하기 전에 적용한다.
--
-- 왜 정책이 아니라 컬럼 권한인가: RLS 정책은 '행'만 고르고 '열'은 못 고른다.
-- PostgREST는 컬럼 GRANT를 그대로 존중하므로, 열 단위 차단은 이 방법이 정석이다.
--
-- 앱 영향 확인(적용 전 검토 결과):
--   · 공개 조회는 전부 컬럼을 명시한다(랜딩·구독 페이지) — select=* 사용처 없음.
--     랜딩: id, display_name, content, rating, created_at, exam_score, verified
--     구독: display_name, content, rating, exam_score
--   · 후기 작성은 insert만 하고 RETURNING(.select())을 쓰지 않아 SELECT 권한이 필요 없다.
--   · RLS 정책식(auth.uid() = user_id)은 시스템이 평가하므로 컬럼 권한과 무관하다.
--   · 관리자 화면은 service_role이라 이 GRANT의 영향을 받지 않는다.
-- =============================================

-- 열 단위로 다시 주려면 테이블 전체 SELECT를 먼저 회수해야 한다.
REVOKE SELECT ON public.reviews FROM anon, authenticated;

-- 화면에 실제로 쓰는 열만 공개한다(위 목록의 합집합 + 노출 판단에 필요한 is_visible).
GRANT SELECT (
  id, display_name, content, rating, exam_score, verified, is_visible, created_at
) ON public.reviews TO anon, authenticated;

-- INSERT/DELETE 권한은 건드리지 않는다(후기 작성·본인 삭제는 그대로 동작).

-- 확인용(선택):
--   anon 키로 아래를 호출하면 400이어야 한다.
--     GET /rest/v1/reviews?select=user_id
--   아래는 정상(200)이어야 한다.
--     GET /rest/v1/reviews?select=display_name,content,rating,exam_score
