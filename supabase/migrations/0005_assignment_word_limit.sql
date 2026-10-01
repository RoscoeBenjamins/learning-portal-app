-- Word limit per assignment (applied 2026-10-01). Safe to re-run.
-- The admin types the required word count on the assignment card; the draft coach
-- scales its section targets to it, and the content generator uses it for breakdowns.
alter table public.assignments add column if not exists word_limit integer
  check (word_limit is null or word_limit between 50 and 50000);

-- Admins may update only this column from the portal.
grant update (word_limit) on public.assignments to authenticated;
drop policy if exists assignments_admin_word_limit on public.assignments;
create policy assignments_admin_word_limit on public.assignments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
