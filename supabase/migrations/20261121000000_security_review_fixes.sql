-- Fixes from a security review of the database rules (14 November 2026; found while building Both Ends, which
-- started from this schema). The keyring item from that review was already fixed in 20261120000000.
--
-- 1. Kind notes stay anonymous. The reminder that announces a kind note used to be recorded as made by the
--    sender, and people can see reminders they made, so a sender could learn who received their note.
-- 2. Nobody can read who sent a kind note. Supabase grants every new table to signed-in users, so the
--    column-only grants meant to hide sender_id did nothing until that table-wide grant is taken away.
-- 3. View-only members can't send "check on" alerts or observation requests (they can't add entries either).
-- 4. An unused invite can be canceled only by whoever made it, or by the circle's owner.
-- 5. The list of app admins is closed to direct reads (it was already empty to everyone through row-level
--    security; is_app_admin() keeps working).

-- ---------- 1. Kind-note reminders belong to the recipient ----------
create or replace function public.send_kindness(message_id integer, icon text) returns boolean
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); target uuid; nid uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if message_id is null or message_id not between 0 and 199 then raise exception 'unknown message'; end if;
  if icon is null or icon not in ('sun', 'flower', 'star', 'heart', 'leaf', 'sparkle') then raise exception 'unknown icon'; end if;
  if (select count(*) from public.kind_notes where sender_id = me and created_at > now() - interval '1 day') >= 5 then
    raise exception 'daily limit reached';
  end if;
  select o.user_id into target from public.kindness_optin o
    where o.receive and o.user_id <> me
      and (select count(*) from public.kind_notes k where k.recipient_id = o.user_id and k.created_at > now() - interval '1 day') < 3
      and not exists (select 1 from public.kind_notes k where k.recipient_id = o.user_id and k.sender_id = me and k.created_at > now() - interval '7 days')
    order by random() limit 1;
  if target is null then return false; end if;
  insert into public.kind_notes (sender_id, recipient_id, message_id, icon) values (me, target, message_id, icon) returning id into nid;
  -- created_by is the recipient, so the sender can neither see nor cancel this reminder.
  insert into public.reminders (user_id, created_by, kind, fire_at, tag) values (target, target, 'kindness', now(), 'kind-' || nid);
  return true;
end $$;
revoke execute on function public.send_kindness(integer, text) from public, anon;
grant execute on function public.send_kindness(integer, text) to authenticated;

-- Reminders already queued the old way.
update public.reminders set created_by = user_id where kind = 'kindness' and created_by <> user_id;

-- ---------- 2. Kind notes: only the safe columns ----------
revoke all on public.kind_notes from anon, authenticated;
grant select (id, message_id, icon, created_at, read_at) on public.kind_notes to authenticated;
grant update (read_at) on public.kind_notes to authenticated;

-- ---------- 3. Only people who can add to a circle can wake its members ----------
-- True when the caller can write to a circle that `other` also belongs to.
create function public.can_wake(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circle_members a join public.circle_members b on a.circle_id = b.circle_id
    where a.user_id = auth.uid() and a.role in ('owner', 'member') and b.user_id = other
  );
$$;
revoke execute on function public.can_wake(uuid) from public, anon;
grant execute on function public.can_wake(uuid) to authenticated;

alter policy "schedule reminders" on public.reminders
  with check (((created_by = (select auth.uid())) AND (sent_at IS NULL) AND ((user_id = (select auth.uid()))
    OR ((kind = ANY (ARRAY['observation'::text, 'checkon'::text])) AND can_wake(user_id)))));

-- ---------- 4. Canceling invites ----------
drop policy "members revoke invites" on public.invites;
create policy "revoke invites" on public.invites for delete to authenticated
  using (((created_by = (select auth.uid())) OR is_circle_owner(circle_id)));

-- ---------- 5. Admin list ----------
revoke all on public.app_admins from anon, authenticated;
