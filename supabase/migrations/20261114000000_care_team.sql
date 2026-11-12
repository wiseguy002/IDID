-- Care team: read-only, scoped sharing with a therapist, counselor or other trusted professional.
--
-- The person's device encrypts a summary of exactly what they chose to share with a key that lives
-- only in the link they give their therapist (after the #, never sent to us). This table stores that
-- ciphertext, so the server can't read it either. Removing someone deletes the row, and the link
-- stops working.

create table public.care_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ct text not null default '' check (char_length(ct) <= 4000000),
  expires_at timestamptz,
  views integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index care_shares_owner_idx on public.care_shares (owner_id);

create function public.touch_care_share() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger care_shares_touch before update of ct, expires_at on public.care_shares
  for each row execute function public.touch_care_share();

alter table public.care_shares enable row level security;
create policy "own care shares" on public.care_shares for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Owners can read, create, update the encrypted summary and expiry, and delete. View counts are
-- written only by get_care_share.
revoke all on public.care_shares from anon, authenticated;
grant select, delete on public.care_shares to authenticated;
grant insert (ct, expires_at), update (ct, expires_at) on public.care_shares to authenticated;

-- Opening a care-team link: anyone holding the link can fetch the ciphertext (and only the key in
-- the link can decrypt it). Each open is counted so the person can see when it was last viewed.
create function public.get_care_share(share_id uuid)
returns table (ct text, updated_at timestamptz)
language sql volatile security definer set search_path = public as $$
  with opened as (
    update public.care_shares s set views = s.views + 1, last_viewed_at = now()
    where s.id = share_id and s.ct <> '' and (s.expires_at is null or s.expires_at > now())
    returning s.ct, s.updated_at
  )
  select * from opened;
$$;
revoke execute on function public.get_care_share(uuid) from public;
grant execute on function public.get_care_share(uuid) to anon, authenticated;
