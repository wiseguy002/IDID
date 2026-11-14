-- Circle key rotation after removing someone.
--
-- The circle's AES key is sealed separately to each member's public key. When the owner removes someone, the
-- app makes a new circle key, seals it to everyone still in the circle, re-encrypts the shared records with it,
-- and keeps the old keys in an encrypted "keyring" record so members whose devices haven't caught up lose
-- nothing. These two functions are the only server pieces it needs.

-- Members' public keys, so the owner can seal a new circle key to each of them. Public keys are not secret,
-- but only people in the same circle can list them.
create function public.circle_public_keys(c uuid) returns table (user_id uuid, public_key jsonb)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.public_key
  from public.circle_members m join public.profiles p on p.id = m.user_id
  where m.circle_id = c and public.is_circle_member(c);
$$;

-- Owner only: give every current member their copy of the new circle key, all at once.
-- `sealed` maps each member's user id to their sealed key, and must cover exactly the current members.
-- Unused invite links carry the old key, so they are cancelled.
create function public.rotate_circle_key(c uuid, sealed jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_circle_owner(c) then raise exception 'only the circle owner can change the circle key'; end if;
  if jsonb_typeof(sealed) <> 'object' then raise exception 'bad keys'; end if;
  if exists (select 1 from public.circle_members m where m.circle_id = c and not (sealed ? m.user_id::text)) then
    raise exception 'every member needs a copy of the new key';
  end if;
  if exists (select 1 from jsonb_each(sealed) k where jsonb_typeof(k.value) <> 'string' or char_length(k.value #>> '{}') > 2000
             or not exists (select 1 from public.circle_members m where m.circle_id = c and m.user_id::text = k.key)) then
    raise exception 'keys must be for current members only';
  end if;
  update public.circle_members m set sealed_circle_key = sealed ->> m.user_id::text where m.circle_id = c;
  delete from public.invites where circle_id = c and used_by is null;
end $$;

revoke execute on function public.circle_public_keys(uuid), public.rotate_circle_key(uuid, jsonb) from public, anon;
grant execute on function public.circle_public_keys(uuid), public.rotate_circle_key(uuid, jsonb) to authenticated;
