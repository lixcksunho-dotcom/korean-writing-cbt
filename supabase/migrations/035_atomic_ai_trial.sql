-- =============================================
-- 무료 AI 체험 횟수를 원자적으로 차감한다
-- Supabase SQL Editor에서 실행하세요. 선행 없음.
--
-- 지금 구조: 체험 사용량을 auth.users.app_metadata.ai_trial_used 에 둔다.
--   1) 읽는다      const used = app_metadata.ai_trial_used ?? 0
--   2) 검사한다    if (used >= 3) 거절
--   3) 쓴다        updateUserById(app_metadata: { ai_trial_used: used + 1 })
--
-- 1~3 사이에 다른 요청이 끼어들 수 있다. 같은 계정으로 요청 N개를 동시에 던지면
-- 전부 같은 used를 읽고, 전부 검사를 통과하고, 전부 used+1을 쓴다.
-- 결과: 카운터는 1만 올라가는데 **유료 API는 N번 호출된다.**
-- (실측: 같은 값으로 동시에 3번 갱신했더니 결과가 2였다)
--
-- 유료 사용자의 하루 30회 한도(usage_daily)도 같은 방식이지만 그쪽은 코드 주석에
-- '실익이 없어 그대로 둔다'고 판단이 적혀 있다. 무료 체험은 다르다 —
-- 갓 만든 계정으로 누구나 시도할 수 있고, 그대로 외부 API 요금이 된다.
--
-- 고치는 방법: 증가를 DB 한 문장 안에서 끝낸다. UPDATE ... WHERE used < limit 은
-- 행 잠금이 걸려 직렬화되므로, 동시에 들어와도 한도를 넘겨 통과하지 못한다.
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_trial_usage (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  used int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_trial_usage ENABLE ROW LEVEL SECURITY;
-- 정책을 두지 않는다 = anon·authenticated 는 접근 불가. service_role만 만진다.

-- 지금까지 쌓인 값을 옮겨 온다(안 옮기면 이미 3회 쓴 사람이 3회를 더 받는다).
INSERT INTO public.ai_trial_usage (user_id, used)
SELECT id, COALESCE((raw_app_meta_data ->> 'ai_trial_used')::int, 0)
FROM auth.users
WHERE COALESCE((raw_app_meta_data ->> 'ai_trial_used')::int, 0) > 0
ON CONFLICT (user_id) DO NOTHING;

-- 차감: 한도 안이면 1 올리고 true, 아니면 아무것도 안 하고 false.
-- 두 문장이 아니라 한 문장이라는 게 요점이다.
CREATE OR REPLACE FUNCTION public.consume_ai_trial(p_user uuid, p_limit int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used int;
BEGIN
  INSERT INTO public.ai_trial_usage (user_id, used)
  VALUES (p_user, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.ai_trial_usage
     SET used = used + 1, updated_at = now()
   WHERE user_id = p_user AND used < p_limit
  RETURNING used INTO v_used;

  RETURN v_used IS NOT NULL;
END;
$$;

-- 되돌리기(통신 오류로 응답 자체를 못 받았을 때만). 0 아래로는 안 내려간다.
CREATE OR REPLACE FUNCTION public.refund_ai_trial(p_user uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_trial_usage
     SET used = GREATEST(used - 1, 0), updated_at = now()
   WHERE user_id = p_user;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_trial(uuid, int) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_ai_trial(uuid) FROM public, anon, authenticated;

-- 확인용(선택):
--   SELECT public.consume_ai_trial('<user-uuid>', 3);  -- 3번은 true, 4번째부터 false
--   SELECT * FROM public.ai_trial_usage WHERE user_id = '<user-uuid>';
