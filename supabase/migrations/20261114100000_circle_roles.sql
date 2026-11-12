-- Per-person access in a circle. The circle's owner decides what each person can do:
--   member  can view what the circle shares and add or change entries
--   viewer  can view what the circle shares, but the server refuses their changes
-- (People who should only see selected information are not circle members at all: they get their
-- own encrypted, read-only view of just those things through care_shares.)

alter table public.circle_members drop constraint circle_members_role_check;
alter table public.circle_members add constraint circle_members_role_check check (role in ('owner', 'member', 'viewer'));

alter table public.invites add column role text not null default 'member' check (role in ('member', 'viewer'));

create function public.is_circle_writer(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circle_members m where m.circle_id = c and m.user_id = auth.uid() and m.role in ('owner', 'member'));
$$;
grant execute on function public.is_circle_writer(uuid) to authenticated;

-- Viewers can read but not write records, or invite others.
drop policy "members write records" on public.records;
create policy "members write records" on public.records for insert to authenticated
  with check (public.is_circle_writer(circle_id) and updated_by = auth.uid());
drop policy "members update records" on public.records;
create policy "members update records" on public.records for update to authenticated
  using (public.is_circle_writer(circle_id)) with check (public.is_circle_writer(circle_id));
drop policy "members create invites" on public.invites;
create policy "members create invites" on public.invites for insert to authenticated
  with check (public.is_circle_writer(circle_id) and created_by = auth.uid() and used_by is null and used_at is null
              and expires_at <= now() + interval '30 days'
              and (role = 'member' or public.is_circle_owner(circle_id)));

-- People may update only their own sealed key; roles change only through set_member_role.
revoke update on public.circle_members from authenticated;
grant update (sealed_circle_key) on public.circle_members to authenticated;

create function public.set_member_role(c uuid, member uuid, new_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_circle_owner(c) then raise exception 'only the circle owner can change access'; end if;
  if new_role not in ('member', 'viewer') then raise exception 'unknown role'; end if;
  update public.circle_members set role = new_role where circle_id = c and user_id = member and role <> 'owner';
  if not found then raise exception 'no such person in this circle'; end if;
end $$;
revoke execute on function public.set_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

-- Invites carry the access level chosen when they were made.
create or replace function public.accept_invite(invite_id uuid, sealed_key text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; r text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.invites set used_by = auth.uid(), used_at = now()
    where id = invite_id and used_at is null and expires_at > now()
    returning circle_id, role into cid, r;
  if cid is null then raise exception 'invite is invalid, used or expired'; end if;
  insert into public.circle_members (circle_id, user_id, role, sealed_circle_key)
    values (cid, auth.uid(), r, sealed_key)
    on conflict (circle_id, user_id) do update set sealed_circle_key = excluded.sealed_circle_key;
  return cid;
end $$;
