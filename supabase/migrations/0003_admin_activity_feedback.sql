-- Admin portal, activity log and feedback. Run once in Supabase → SQL Editor.
-- Also adds assignments.model_answer_md if it is missing (already applied on 2026-09-30).
alter table public.assignments add column if not exists model_answer_md text;

create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz default now());
alter table public.admins enable row level security;
insert into public.admins(user_id) select id from auth.users where email = 'fafale17@gmail.com' on conflict do nothing;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admins where user_id = auth.uid());
$$;
drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select using (user_id = auth.uid());

create table if not exists public.activity_log (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event text not null, path text, meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now());
create index if not exists activity_log_user_time on public.activity_log(user_id, created_at desc);
create index if not exists activity_log_time on public.activity_log(created_at desc);
alter table public.activity_log enable row level security;
drop policy if exists activity_insert_own on public.activity_log;
drop policy if exists activity_admin_read on public.activity_log;
create policy activity_insert_own on public.activity_log for insert with check (user_id = auth.uid());
create policy activity_admin_read on public.activity_log for select using (public.is_admin());

create table if not exists public.feedback (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null default 'suggestion' check (category in ('suggestion','bug','content','other')),
  rating int check (rating between 1 and 5),
  message text not null check (length(message) between 3 and 4000),
  page text,
  status text not null default 'new' check (status in ('new','planned','done','declined')),
  admin_reply text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.feedback enable row level security;
drop policy if exists feedback_insert_own on public.feedback;
drop policy if exists feedback_read on public.feedback;
drop policy if exists feedback_admin_update on public.feedback;
create policy feedback_insert_own on public.feedback for insert with check (user_id = auth.uid());
create policy feedback_read on public.feedback for select using (user_id = auth.uid() or public.is_admin());
create policy feedback_admin_update on public.feedback for update using (public.is_admin());

-- Admin-only views over auth data (each checks is_admin() first).
create or replace function public.admin_users() returns table (
  id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz,
  mfa_factors int, is_admin boolean, events_7d bigint, last_seen timestamptz, quiz_attempts bigint)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not authorised'; end if;
  return query select u.id, u.email::text, u.created_at, u.last_sign_in_at, u.banned_until,
    (select count(*)::int from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified'),
    exists(select 1 from public.admins a where a.user_id = u.id),
    (select count(*) from public.activity_log l where l.user_id = u.id and l.created_at > now() - interval '7 days'),
    (select max(l.created_at) from public.activity_log l where l.user_id = u.id),
    (select count(*) from public.attempts t where t.user_id = u.id)
  from auth.users u order by u.created_at desc;
end $$;

create or replace function public.admin_activity(p_user uuid default null, p_limit int default 200) returns table (
  id bigint, user_id uuid, email text, event text, path text, meta jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not authorised'; end if;
  return query select l.id, l.user_id, u.email::text, l.event, l.path, l.meta, l.created_at
  from public.activity_log l join auth.users u on u.id = l.user_id
  where p_user is null or l.user_id = p_user
  order by l.created_at desc limit least(p_limit, 1000);
end $$;

create or replace function public.admin_auth_log(p_limit int default 200) returns table (created_at timestamptz, email text, action text, ip text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not authorised'; end if;
  return query select e.created_at,
    coalesce(e.payload->>'actor_username', e.payload->'traits'->>'user_email')::text,
    (e.payload->>'action')::text, e.ip_address::text
  from auth.audit_log_entries e order by e.created_at desc limit least(p_limit, 1000);
end $$;

create or replace function public.admin_set_suspended(p_user uuid, p_suspend boolean) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not authorised'; end if;
  if p_user = auth.uid() then raise exception 'You cannot suspend your own account'; end if;
  update auth.users set banned_until = case when p_suspend then 'infinity'::timestamptz else null end where id = p_user;
  insert into public.activity_log(user_id, event, meta)
  values (auth.uid(), case when p_suspend then 'admin_suspend' else 'admin_unsuspend' end, jsonb_build_object('target', p_user));
end $$;

create or replace function public.admin_reset_mfa(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not authorised'; end if;
  delete from auth.mfa_factors where user_id = p_user;
  insert into public.activity_log(user_id, event, meta) values (auth.uid(), 'admin_reset_mfa', jsonb_build_object('target', p_user));
end $$;

revoke execute on function public.admin_users(), public.admin_activity(uuid, int), public.admin_auth_log(int),
  public.admin_set_suspended(uuid, boolean), public.admin_reset_mfa(uuid) from anon, public;
grant execute on function public.admin_users(), public.admin_activity(uuid, int), public.admin_auth_log(int),
  public.admin_set_suspended(uuid, boolean), public.admin_reset_mfa(uuid), public.is_admin() to authenticated;
