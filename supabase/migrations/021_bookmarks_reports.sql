-- =====================================================================
-- 즐겨찾기(bookmarks) + 문제 오류 신고(question_reports)
-- Supabase SQL Editor에 붙여넣고 Run. 재실행 안전.
-- =====================================================================

-- 즐겨찾기 — 본인 것만 관리
create table if not exists public.bookmarks (
  user_id     uuid references auth.users(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  created_at  timestamptz default now(),
  primary key (user_id, question_id)
);
alter table public.bookmarks enable row level security;

drop policy if exists "bookmarks_select" on public.bookmarks;
drop policy if exists "bookmarks_insert" on public.bookmarks;
drop policy if exists "bookmarks_delete" on public.bookmarks;
create policy "bookmarks_select" on public.bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_delete" on public.bookmarks for delete using (auth.uid() = user_id);

-- 문제 오류 신고 — 사용자는 작성만, 조회/처리는 관리자(service_role)
create table if not exists public.question_reports (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete set null,
  question_id uuid references public.questions(id) on delete cascade not null,
  reason      text not null,
  resolved    boolean default false,
  created_at  timestamptz default now()
);
alter table public.question_reports enable row level security;

drop policy if exists "reports_insert" on public.question_reports;
create policy "reports_insert" on public.question_reports for insert with check (auth.uid() = user_id);
