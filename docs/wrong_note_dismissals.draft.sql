-- 사람이 SQL Editor에서 검토 후 실행. 실행 전 이름을 번호 규칙(0NN_)으로 바꿀 것
create table if not exists public.wrong_note_dismissals (
  user_id uuid references auth.users(id) on delete cascade not null,
  program text not null check (program in ('silyong', 'kbs')),
  question_id uuid references public.questions(id) on delete cascade not null,
  dismissed_at timestamptz not null default now(),
  constraint wrong_note_dismissals_user_question_key unique (user_id, question_id)
);

create index if not exists wrong_note_dismissals_user_program_idx
  on public.wrong_note_dismissals (user_id, program);

alter table public.wrong_note_dismissals enable row level security;

drop policy if exists "wrong_note_dismissals_select" on public.wrong_note_dismissals;
drop policy if exists "wrong_note_dismissals_insert" on public.wrong_note_dismissals;
drop policy if exists "wrong_note_dismissals_delete" on public.wrong_note_dismissals;

create policy "wrong_note_dismissals_select" on public.wrong_note_dismissals
  for select to authenticated using (auth.uid() = user_id);
create policy "wrong_note_dismissals_insert" on public.wrong_note_dismissals
  for insert to authenticated with check (auth.uid() = user_id);
create policy "wrong_note_dismissals_delete" on public.wrong_note_dismissals
  for delete to authenticated using (auth.uid() = user_id);

-- 기본 권한에 기대면 환경에 따라 본인 행 작업도 거부되거나 불필요한 권한이 남는다.
revoke all on table public.wrong_note_dismissals from public, anon, authenticated;
grant select, insert, delete on table public.wrong_note_dismissals to authenticated;
