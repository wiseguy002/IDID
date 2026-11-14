-- Make a circle key change all-or-nothing, and protect the keyring.
--
-- Before: the app swapped everyone's sealed key, then saved the keyring (which links the new key to the old ones)
-- as a separate request. If that second request failed, or someone opened the circle in between, devices got the
-- new key with no way to read older records. Now the swap and the keyring are saved in one transaction.
--
-- The keyring is also no longer writable through the ordinary record policies, so only the owner, through
-- this function, can change it.

drop function public.rotate_circle_key(uuid, jsonb);

-- Owner only: give every current member their copy of the new circle key and save the keyring, all at once.
-- `sealed` maps each member's user id to their sealed key, and must cover exactly the current members.
-- Unused invite links carry the old key, so they are cancelled. Returns how many were cancelled and the
-- keyring's change number (records before it may still need re-encrypting).
create function public.rotate_circle_key(c uuid, sealed jsonb, keyring text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  cancelled int;
  ring_seq bigint;
begin
  if not public.is_circle_owner(c) then raise exception 'only the circle owner can change the circle key'; end if;
  if jsonb_typeof(sealed) <> 'object' then raise exception 'bad keys'; end if;
  if keyring is null or left(keyring, 2) <> 'k:' or char_length(keyring) > 200000 then raise exception 'bad keyring'; end if;
  if exists (select 1 from public.circle_members m where m.circle_id = c and not (sealed ? m.user_id::text)) then
    raise exception 'every member needs a copy of the new key';
  end if;
  if exists (select 1 from jsonb_each(sealed) k where jsonb_typeof(k.value) <> 'string' or char_length(k.value #>> '{}') > 2000
             or not exists (select 1 from public.circle_members m where m.circle_id = c and m.user_id::text = k.key)) then
    raise exception 'keys must be for current members only';
  end if;
  update public.circle_members m set sealed_circle_key = sealed ->> m.user_id::text where m.circle_id = c;
  insert into public.records (circle_id, rid, ct, updated_by) values (c, 'keyring-circle-v1', keyring, (select auth.uid()))
    on conflict (circle_id, rid) do update set ct = excluded.ct
    returning seq into ring_seq;
  delete from public.invites where circle_id = c and used_by is null;
  get diagnostics cancelled = row_count;
  return jsonb_build_object('cancelled', cancelled, 'seq', ring_seq);
end $$;

revoke execute on function public.rotate_circle_key(uuid, jsonb, text) from public, anon;
grant execute on function public.rotate_circle_key(uuid, jsonb, text) to authenticated;

-- Only rotate_circle_key may write the keyring. (Same form as 20261119000000_rls_initplan.sql.)
alter policy "members write records" on public.records
  with check ((is_circle_writer(circle_id) AND (updated_by = (select auth.uid())) AND (rid <> 'keyring-circle-v1')));
alter policy "members update records" on public.records
  using ((is_circle_writer(circle_id) AND (rid <> 'keyring-circle-v1')))
  with check ((is_circle_writer(circle_id) AND (rid <> 'keyring-circle-v1')));
