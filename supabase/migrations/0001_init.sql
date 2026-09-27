-- Learning Portal schema
-- Run once in Supabase > SQL Editor.

-- ---------- Helpers ----------
-- True only when the current session has passed 2FA (aal2).
create or replace function public.is_mfa_verified()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
$$;

-- ---------- Shared course content (written only by the publish script) ----------
create table public.courses (
  code          text primary key,               -- e.g. 'CICS 501'
  title         text not null,
  lecturer      text,
  schedule      text,
  venue         text,
  drive_folder_id text,
  is_project    boolean not null default false,  -- CIIS 691 thesis course
  sort_order    int not null default 0,
  updated_at    timestamptz not null default now()
);

create table public.topics (
  id            text primary key,               -- e.g. 'cics501-t03-normalisation'
  course_code   text not null references public.courses(code) on delete cascade,
  position      int not null,
  title         text not null,
  summary       text,
  content_md    text not null default '',        -- course book section (markdown + ```mermaid diagrams)
  audio_script  text not null default '',        -- short spoken overview
  key_terms     jsonb not null default '[]',     -- [{term, meaning}]
  source_files  jsonb not null default '[]',     -- [{id, name}]
  updated_at    timestamptz not null default now()
);
create index on public.topics(course_code, position);

create table public.flashcards (
  id          bigint generated always as identity primary key,
  topic_id    text not null references public.topics(id) on delete cascade,
  position    int not null default 0,
  front       text not null,
  back        text not null
);
create index on public.flashcards(topic_id);

create table public.questions (
  id           text primary key,                 -- stable id so attempts stay linked on updates
  topic_id     text not null references public.topics(id) on delete cascade,
  position     int not null default 0,
  question     text not null,
  options      jsonb not null,                   -- ["A","B","C","D"]
  answer_index int not null,
  explanation  text not null,
  difficulty   text not null default 'medium'    -- easy | medium | hard
);
create index on public.questions(topic_id);

create table public.assignments (
  id             text primary key,
  course_code    text not null references public.courses(code) on delete cascade,
  title          text not null,
  drive_file_id  text,
  due_date       date,
  brief_md       text not null default '',       -- what the lecturer asked (summarised)
  breakdown_md   text not null default '',       -- guided breakdown: what each question asks, topics, structure, rubric, parallel example
  related_topics jsonb not null default '[]',    -- [topic_id]
  updated_at     timestamptz not null default now()
);

create table public.draft_feedback (
  id             bigint generated always as identity primary key,
  assignment_id  text not null references public.assignments(id) on delete cascade,
  drive_file_id  text not null unique,
  draft_name     text not null,
  feedback_md    text not null,
  created_at     timestamptz not null default now()
);

create table public.processed_files (
  drive_file_id  text primary key,
  name           text not null,
  modified_time  timestamptz,
  processed_at   timestamptz not null default now()
);

-- ---------- Per-user data ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

create table public.attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_code text not null references public.courses(code) on delete cascade,
  topic_id    text references public.topics(id) on delete set null,  -- null = whole-course test
  mode        text not null check (mode in ('topic_check','test')),
  score       int not null,
  total       int not null,
  answers     jsonb not null default '[]',     -- [{question_id, chosen, correct}]
  created_at  timestamptz not null default now()
);
create index on public.attempts(user_id, course_code);

create table public.flashcard_reviews (
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  flashcard_id bigint not null references public.flashcards(id) on delete cascade,
  known        boolean not null,
  reviewed_at  timestamptz not null default now(),
  primary key (user_id, flashcard_id)
);

create table public.dissertation_requests (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic       text not null,
  details     text,
  status      text not null default 'pending' check (status in ('pending','ready')),
  guide_md    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row-level security ----------
alter table public.courses               enable row level security;
alter table public.topics                enable row level security;
alter table public.flashcards            enable row level security;
alter table public.questions             enable row level security;
alter table public.assignments           enable row level security;
alter table public.draft_feedback        enable row level security;
alter table public.processed_files       enable row level security;
alter table public.profiles              enable row level security;
alter table public.attempts              enable row level security;
alter table public.flashcard_reviews     enable row level security;
alter table public.dissertation_requests enable row level security;

-- Shared content: any signed-in user who has passed 2FA can read. Nobody can write
-- through the API (the publish script uses the service-role key, which bypasses RLS).
create policy "read content" on public.courses        for select to authenticated using (public.is_mfa_verified());
create policy "read content" on public.topics         for select to authenticated using (public.is_mfa_verified());
create policy "read content" on public.flashcards     for select to authenticated using (public.is_mfa_verified());
create policy "read content" on public.questions      for select to authenticated using (public.is_mfa_verified());
create policy "read content" on public.assignments    for select to authenticated using (public.is_mfa_verified());
create policy "read content" on public.draft_feedback for select to authenticated using (public.is_mfa_verified());
-- processed_files: no policies = no API access.

-- Own rows only, and only after 2FA
create policy "own profile" on public.profiles for all to authenticated
  using (id = auth.uid() and public.is_mfa_verified())
  with check (id = auth.uid() and public.is_mfa_verified());

create policy "own attempts read" on public.attempts for select to authenticated
  using (user_id = auth.uid() and public.is_mfa_verified());
create policy "own attempts insert" on public.attempts for insert to authenticated
  with check (user_id = auth.uid() and public.is_mfa_verified());

create policy "own reviews" on public.flashcard_reviews for all to authenticated
  using (user_id = auth.uid() and public.is_mfa_verified())
  with check (user_id = auth.uid() and public.is_mfa_verified());

create policy "own dissertation read" on public.dissertation_requests for select to authenticated
  using (user_id = auth.uid() and public.is_mfa_verified());
create policy "own dissertation insert" on public.dissertation_requests for insert to authenticated
  with check (user_id = auth.uid() and public.is_mfa_verified() and status = 'pending' and guide_md is null);

-- ---------- Table privileges (RLS above still decides which rows) ----------
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select on public.courses, public.topics, public.flashcards, public.questions,
                public.assignments, public.draft_feedback to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.attempts to authenticated;
grant select, insert, update, delete on public.flashcard_reviews to authenticated;
grant select, insert on public.dissertation_requests to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------- Seed the semester's courses ----------
insert into public.courses (code, title, lecturer, schedule, venue, drive_folder_id, is_project, sort_order) values
 ('CICS 501',  'Database Management Systems',          'Dr. Fred Amankwah-Sarfo',      'Saturday 7:00–10:00 AM',  null,  '1FzORo_Wevf_Syy0TpQJo9gP2Gri43CXa', false, 1),
 ('CIIS 534',  'IT Governance',                        'Prof. Stephen Asunka',         'Saturday 11:00 AM–2:00 PM', null, '1KVnA0_XWbiL0S3QeEw1M-I2mfpoClomO', false, 2),
 ('CIIS 532',  'IT Project and Change Management',     'Prof. George Amoako',          'Saturday 3:00–6:00 PM',   null,  '1mhKrOEh9p8Hve6Yhc2wJpV_fPiCqCGA-', false, 3),
 ('CIIS 6011', 'Big Data Mining and Analytics',        'Dr. Emmanuel Eli-Fianu',       'Sunday 11:00 AM–2:00 PM', null,  '1y_oakj1gEwCiqhTbAf0BAMTtVjF8daoT', false, 4),
 ('CICS 502',  'Network and Information Security',     'Dr. Israel Edem Agbehadji',    'Sunday 3:00–6:00 PM',     'C10', '1tHODqk_S6pBLrEjkze_ycg6llgXtEG7X', false, 5),
 ('CIIS 691',  'Masters Thesis / Project',             'All supervisors',              null,                      null,  '1gJkoCP03n-jfF_sTYxFrIhWwLNZpI0lh', true,  6)
on conflict (code) do nothing;
