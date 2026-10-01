-- AI drafts written by DeepSeek and Perplexity (applied 2026-10-01). Safe to re-run.
-- One row per user, assignment and provider. Written by the ai-draft Edge Function
-- (with the caller's own JWT, so RLS applies); only admins can generate.
create table if not exists public.ai_drafts (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  assignment_id text not null references public.assignments(id) on delete cascade,
  provider text not null check (provider in ('deepseek','perplexity')),
  sections jsonb not null default '{}'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, assignment_id, provider));
alter table public.ai_drafts enable row level security;
drop policy if exists ai_drafts_own_select on public.ai_drafts;
drop policy if exists ai_drafts_admin_insert on public.ai_drafts;
drop policy if exists ai_drafts_admin_update on public.ai_drafts;
drop policy if exists ai_drafts_own_delete on public.ai_drafts;
create policy ai_drafts_own_select on public.ai_drafts for select using (user_id = auth.uid());
create policy ai_drafts_admin_insert on public.ai_drafts for insert with check (user_id = auth.uid() and public.is_admin());
create policy ai_drafts_admin_update on public.ai_drafts for update using (user_id = auth.uid() and public.is_admin()) with check (user_id = auth.uid());
create policy ai_drafts_own_delete on public.ai_drafts for delete using (user_id = auth.uid());
grant select, insert, update, delete on public.ai_drafts to authenticated;
grant usage, select on sequence public.ai_drafts_id_seq to authenticated;
