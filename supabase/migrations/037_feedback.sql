-- 고객 불편사항 접수 창구.
-- 지금까지 문의 수단이 이메일(mailto)뿐이라, 메일 앱을 여는 사람만 말할 수 있었다.
-- 대부분은 조용히 떠나므로 무엇이 불편했는지 알 방법이 없었다.
--
-- 읽기는 운영자(service_role)만 한다. 쓰기도 API 라우트(service_role)를 거치게 해서
-- 테이블을 클라이언트에 열지 않는다 — 정책을 열어 두면 누구나 무한히 쓸 수 있다.
create table if not exists public.feedback (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete set null,
  message    text not null,
  -- 어느 화면에서 눌렀는지. 같은 화면에 불편이 몰리면 그 화면부터 고친다.
  path       text,
  -- 답을 받고 싶은 사람만 남긴다(선택). 없으면 접수만 된다.
  contact    text,
  user_agent text,
  resolved   boolean default false,
  created_at timestamptz default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;
-- 정책을 하나도 만들지 않는다 = service_role 외에는 읽지도 쓰지도 못한다.
-- (RLS 정책과 테이블 권한은 다른 층이다. 여기서는 둘 다 안 연다.)
