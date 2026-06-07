-- =====================================================================
-- 계정 공유 방지 — 기기 추적 + 일일 사용량 (Supabase SQL Editor에 붙여넣고 Run)
--   device_usage : 계정별 사용 기기(쿠키 식별자) 기록 → 최대 3대 제한
--   usage_daily  : 계정별 일자별 AI 첨삭 횟수 → 하루 30회 제한
-- 두 테이블 모두 service_role(서버)만 접근. RLS 켜고 정책 없음 = 클라이언트 차단.
-- =====================================================================

create table if not exists public.device_usage (
  user_id    uuid references auth.users(id) on delete cascade not null,
  device_id  text not null,
  first_seen timestamptz default now(),
  last_seen  timestamptz default now(),
  primary key (user_id, device_id)
);
alter table public.device_usage enable row level security;

create table if not exists public.usage_daily (
  user_id     uuid references auth.users(id) on delete cascade not null,
  day         date not null,
  grade_count int default 0,
  primary key (user_id, day)
);
alter table public.usage_daily enable row level security;
