-- Draft coach (applied 2026-09-30). Kept here for the record; safe to re-run.
alter table public.assignments add column if not exists coach_sections jsonb not null default '[]'::jsonb;
create table if not exists public.drafts (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  assignment_id text not null references public.assignments(id) on delete cascade,
  sections jsonb not null default '{}'::jsonb,
  feedback_status text not null default 'none' check (feedback_status in ('none','requested','ready')),
  requested_at timestamptz, feedback_md text, feedback_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, assignment_id));
alter table public.drafts enable row level security;
drop policy if exists drafts_own_select on public.drafts;
drop policy if exists drafts_own_insert on public.drafts;
drop policy if exists drafts_own_update on public.drafts;
create policy drafts_own_select on public.drafts for select using (user_id = auth.uid());
create policy drafts_own_insert on public.drafts for insert with check (user_id = auth.uid());
create policy drafts_own_update on public.drafts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
