-- Hardening from Supabase's security and performance advisors (14 November 2026). No behavior change.

-- 1. Pin search_path on trigger functions, so they can't be tricked by objects in another schema.
alter function public.bump_record() set search_path = public;
alter function public.touch_profile() set search_path = public;
alter function public.touch_care_share() set search_path = public;

-- 2. Visitors who aren't signed in can't be in a circle, so they don't need the membership helpers.
--    Signed-in users keep them: row-level security policies call them.
revoke execute on function public.is_circle_member(uuid), public.is_circle_owner(uuid), public.is_circle_writer(uuid),
  public.shares_circle_with(uuid) from public, anon;
grant execute on function public.is_circle_member(uuid), public.is_circle_owner(uuid), public.is_circle_writer(uuid),
  public.shares_circle_with(uuid) to authenticated;

-- 3. Trigger functions run as triggers, never as API calls.
revoke execute on function public.feedback_guard(), public.bump_record(), public.touch_profile(), public.touch_care_share()
  from public, anon, authenticated;

-- 4. Index foreign keys used by deletes and lookups (cheap at this size; avoids slow scans as iDID grows).
create index if not exists circles_created_by_idx on public.circles (created_by);
create index if not exists feedback_created_by_idx on public.feedback (created_by);
create index if not exists invites_circle_id_idx on public.invites (circle_id);
create index if not exists invites_created_by_idx on public.invites (created_by);
create index if not exists invites_used_by_idx on public.invites (used_by);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index if not exists records_updated_by_idx on public.records (updated_by);
create index if not exists reminders_created_by_idx on public.reminders (created_by);
