-- One-off class changes for a single lecture weekend (applied 2026-10-23).
-- Null columns mean "as usual". mode: Virtual | Face-to-Face | Cancelled.
create table if not exists public.class_overrides (
  block_id text not null references public.lecture_blocks(id) on delete cascade,
  course_code text not null references public.courses(code) on delete cascade,
  class_date date, start_time time, end_time time,
  mode text check (mode in ('Virtual','Face-to-Face','Cancelled')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (block_id, course_code));
alter table public.class_overrides enable row level security;
create policy "read content" on public.class_overrides for select to authenticated using (public.is_mfa_verified());
create policy "admin write" on public.class_overrides for all to authenticated using (public.is_mfa_verified() and public.is_admin()) with check (public.is_mfa_verified() and public.is_admin());
grant select, insert, update, delete on public.class_overrides to authenticated;
-- Example (weekend 23–25 Oct 2026):
-- insert into public.class_overrides (block_id, course_code, class_date, start_time, end_time, mode, note)
-- values ('b04','CICS 501','2026-10-25','15:00','18:00','Virtual','Moved from Sat 7–10 AM; online');
