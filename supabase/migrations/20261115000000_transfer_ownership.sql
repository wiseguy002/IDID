-- Hand a circle to someone else. Typical case: a family member set iDID up first, and later the
-- person whose journal it really is joins; they should manage the circle and who sees what.
--
-- The new owner must already be in the circle. The previous owner stays in it and can still view
-- and add. The circle's creator changes too, so the circle no longer depends on the previous
-- owner's account (deleting an account deletes the circles it created).

create function public.transfer_ownership(c uuid, new_owner uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_circle_owner(c) then raise exception 'only the circle owner can hand it over'; end if;
  if new_owner = auth.uid() then raise exception 'you already own this circle'; end if;
  if not exists (select 1 from public.circle_members where circle_id = c and user_id = new_owner) then
    raise exception 'they need to join the circle first';
  end if;
  update public.circle_members set role = 'member' where circle_id = c and user_id = auth.uid();
  update public.circle_members set role = 'owner' where circle_id = c and user_id = new_owner;
  update public.circles set created_by = new_owner where id = c;
end $$;
revoke execute on function public.transfer_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;
