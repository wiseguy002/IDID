-- Fixes from the 28 November 2026 audit. Safe to run with the current and the older app.

-- 1. Unused invite links stop working when someone leaves, is removed, or is made view only. Otherwise a person
--    who already holds the circle key could use a spare invite to come back with more access.
create function public.cancel_unused_invites() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.invites where circle_id = old.circle_id and used_by is null;
  return null;
end $$;
revoke execute on function public.cancel_unused_invites() from public, anon, authenticated;
create trigger members_gone_cancel_invites after delete on public.circle_members
  for each row execute function public.cancel_unused_invites();
create trigger members_demoted_cancel_invites after update of role on public.circle_members
  for each row when (new.role = 'viewer' and old.role <> 'viewer') execute function public.cancel_unused_invites();

-- 2. The server numbers new records too (it already did for changes). A made-up huge number on a new record
--    would have become every device's sync position and stopped syncing.
create function public.number_record() returns trigger language plpgsql set search_path = public as $$
begin
  new.seq := nextval('public.records_seq');
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.number_record() from public, anon, authenticated;
create trigger records_number before insert on public.records for each row execute function public.number_record();

-- 3. Requests can't be backdated to get around the daily limit.
create or replace function public.feedback_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.feedback where created_by = new.created_by and created_at > now() - interval '1 day') >= 10 then
      raise exception 'daily limit reached';
    end if;
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.feedback_guard() from public, anon;
