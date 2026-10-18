-- Face-to-face venue + weekly Zoom links (applied 2026-10-18).
create table if not exists public.app_settings (key text primary key, value text not null);
alter table public.app_settings enable row level security;
create policy "read content" on public.app_settings for select to authenticated using (public.is_mfa_verified());
grant select on public.app_settings to authenticated;
insert into public.app_settings values ('campus_venue','Graduate Block, GCTU Tesano campus') on conflict (key) do update set value=excluded.value;

-- One Zoom link per class per lecture weekend; admin pastes it on the Schedule page.
create table if not exists public.weekly_links (
  block_id text not null references public.lecture_blocks(id) on delete cascade,
  course_code text not null references public.courses(code) on delete cascade,
  url text not null check (url ~* '^https://'),
  updated_at timestamptz not null default now(),
  primary key (block_id, course_code));
alter table public.weekly_links enable row level security;
create policy "read content" on public.weekly_links for select to authenticated using (public.is_mfa_verified());
create policy "admin write" on public.weekly_links for all to authenticated using (public.is_mfa_verified() and public.is_admin()) with check (public.is_mfa_verified() and public.is_admin());
grant select, insert, update, delete on public.weekly_links to authenticated;
