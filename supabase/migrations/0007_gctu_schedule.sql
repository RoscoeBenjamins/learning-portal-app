-- GCTU weekend schedule (applied 2026-10-18). Lecture times on courses + delivery-mode weekends + breaks.
alter table public.courses
  add column if not exists class_day text,   -- fri | sat | sun
  add column if not exists start_time time,  -- Africa/Accra
  add column if not exists end_time time;
create table if not exists public.lecture_blocks (
  id text primary key, start_date date not null, end_date date not null,
  mode text not null,                         -- FoCIS Masters: Virtual | Face-to-Face | N/A
  modes jsonb not null default '{}',          -- all faculties
  updated_at timestamptz not null default now());
create table if not exists public.academic_breaks (
  label text primary key, start_date date not null, end_date date, note text);
alter table public.lecture_blocks enable row level security;
alter table public.academic_breaks enable row level security;
create policy "read content" on public.lecture_blocks for select to authenticated using (public.is_mfa_verified());
create policy "read content" on public.academic_breaks for select to authenticated using (public.is_mfa_verified());
grant select on public.lecture_blocks, public.academic_breaks to authenticated;
-- Data was seeded from the official delivery-mode table and the MSc IT 2nd-semester timetable.
-- To change a weekend's mode:  update public.lecture_blocks set mode='Virtual', modes = modes || '{"focisMasters":"Virtual"}' where id='b06';
-- To change a class time:      update public.courses set start_time='12:30', end_time='14:00', schedule='Saturday 12:30–2:00 PM' where code='CIIS 534';
