-- 방문 트래픽 집계용 페이지뷰 로그.
-- 클라이언트 비콘(/api/track)이 Service Role로만 기록하고, /admin/traffic가 Service Role로만 읽는다.
-- 개인정보(IP 등)는 저장하지 않고, 익명 난수 visitor_id만 사용한다.

create table if not exists public.page_views (
  id          bigint generated always as identity primary key,
  path        text not null,
  visitor_id  text,
  session_id  text,
  referrer    text,
  created_at  timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_visitor_idx     on public.page_views (visitor_id);

-- RLS 켜고 정책은 두지 않는다 → 익명/일반 로그인 사용자는 읽기·쓰기 불가.
-- 트래킹 API와 관리자 대시보드는 Service Role(RLS 우회)로만 접근한다.
alter table public.page_views enable row level security;
