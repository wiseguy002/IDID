-- IDID schema. The server stores only ciphertext: every journal record is an
-- AES-GCM blob encrypted on the person's device. Record ids are keyed hashes,
-- so the server cannot even tell an entry from a part or an appointment.
-- What the server does see: account emails (for sign-in), which accounts share
-- a circle, record sizes and change times, and reminder times for push.

create extension if not exists pgcrypto;

-- ---------- Tables ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- ECDH P-256 public key (JWK). Others seal circle keys to it.
  public_key jsonb not null,
  -- Private key, encrypted with a key derived from the person's passphrase.
  wrapped_private_key text not null,
  key_salt text not null,
  key_iterations integer not null default 600000 check (key_iterations >= 100000),
  -- Key for "only me" entries, sealed to the person's own public key.
  sealed_personal_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  -- The circle's AES key, sealed to this member's public key.
  sealed_circle_key text not null,
  created_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index circle_members_user_idx on public.circle_members (user_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Circle key encrypted with a secret that exists only in the invite link's #fragment.
  wrapped_circle_key text not null,
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create sequence public.records_seq;

create table public.records (
  circle_id uuid not null references public.circles (id) on delete cascade,
  -- HMAC of the record's kind and id under the circle key: opaque to the server.
  rid text not null check (char_length(rid) between 16 and 128),
  ct text not null check (char_length(ct) <= 1000000),
  -- Monotonic change counter, used as the sync cursor.
  seq bigint not null default nextval('public.records_seq'),
  updated_by uuid not null default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (circle_id, rid)
);
create index records_seq_idx on public.records (circle_id, seq);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  -- Who receives the notification.
  user_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('appointment', 'checkin', 'observation')),
  fire_at timestamptz not null,
  -- Client-chosen key so repeated scheduling does not create duplicates.
  tag text not null check (char_length(tag) <= 200),
  -- For appointment reminders: minutes before the start (drives generic wording).
  minutes_before integer,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, tag)
);
create index reminders_due_idx on public.reminders (fire_at) where sent_at is null;

-- ---------- Triggers ----------

create function public.bump_record() returns trigger language plpgsql as $$
begin
  new.seq := nextval('public.records_seq');
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger records_bump before update on public.records for each row execute function public.bump_record();

create function public.touch_profile() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_profile();

-- ---------- Helpers (security definer avoids recursive RLS) ----------

create function public.is_circle_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circle_members where circle_id = c and user_id = auth.uid());
$$;

create function public.is_circle_owner(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circle_members where circle_id = c and user_id = auth.uid() and role = 'owner');
$$;

create function public.shares_circle_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circle_members a join public.circle_members b on a.circle_id = b.circle_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- Create a circle and become its owner in one step.
create function public.create_circle(sealed_key text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.circles (created_by) values (auth.uid()) returning id into cid;
  insert into public.circle_members (circle_id, user_id, role, sealed_circle_key) values (cid, auth.uid(), 'owner', sealed_key);
  return cid;
end $$;

-- Look at an invite before accepting (needs only the invite id from the link).
create function public.get_invite(invite_id uuid)
returns table (circle_id uuid, wrapped_circle_key text, expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.circle_id, i.wrapped_circle_key, i.expires_at from public.invites i
  where i.id = invite_id and i.used_at is null and i.expires_at > now() and auth.uid() is not null;
$$;

-- Accept an invite: join the circle with the circle key re-sealed to your own public key.
create function public.accept_invite(invite_id uuid, sealed_key text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.invites set used_by = auth.uid(), used_at = now()
    where id = invite_id and used_at is null and expires_at > now()
    returning circle_id into cid;
  if cid is null then raise exception 'invite is invalid, used or expired'; end if;
  insert into public.circle_members (circle_id, user_id, role, sealed_circle_key)
    values (cid, auth.uid(), 'member', sealed_key)
    on conflict (circle_id, user_id) do update set sealed_circle_key = excluded.sealed_circle_key;
  return cid;
end $$;

-- ---------- Row-level security ----------

alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.invites enable row level security;
alter table public.records enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminders enable row level security;

create policy "own profile" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "members see circle" on public.circles for select to authenticated using (public.is_circle_member(id));
create policy "owner deletes circle" on public.circles for delete to authenticated using (public.is_circle_owner(id));

create policy "members see members" on public.circle_members for select to authenticated using (public.is_circle_member(circle_id));
create policy "update own key" on public.circle_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leave or remove" on public.circle_members for delete to authenticated
  using (user_id = auth.uid() or public.is_circle_owner(circle_id));

create policy "members manage invites" on public.invites for select to authenticated using (public.is_circle_member(circle_id));
create policy "members create invites" on public.invites for insert to authenticated
  with check (public.is_circle_member(circle_id) and created_by = auth.uid() and used_by is null and used_at is null
              and expires_at <= now() + interval '30 days');
create policy "members revoke invites" on public.invites for delete to authenticated using (public.is_circle_member(circle_id));

create policy "members read records" on public.records for select to authenticated using (public.is_circle_member(circle_id));
create policy "members write records" on public.records for insert to authenticated
  with check (public.is_circle_member(circle_id) and updated_by = auth.uid());
create policy "members update records" on public.records for update to authenticated
  using (public.is_circle_member(circle_id)) with check (public.is_circle_member(circle_id));

create policy "own push subscriptions" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "see own reminders" on public.reminders for select to authenticated
  using (user_id = auth.uid() or created_by = auth.uid());
create policy "schedule reminders" on public.reminders for insert to authenticated
  with check (
    created_by = auth.uid() and sent_at is null
    and (user_id = auth.uid() or (kind = 'observation' and public.shares_circle_with(user_id)))
  );
create policy "cancel own reminders" on public.reminders for delete to authenticated
  using ((user_id = auth.uid() or created_by = auth.uid()) and sent_at is null);

-- Lock down defaults, then grant only what the policies need.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant select, insert, update, delete on public.profiles, public.circle_members, public.invites, public.records,
  public.push_subscriptions, public.reminders to authenticated;
grant select, delete on public.circles to authenticated;
grant usage on sequence public.records_seq to authenticated;
grant execute on function public.create_circle(text), public.get_invite(uuid), public.accept_invite(uuid, text),
  public.is_circle_member(uuid), public.is_circle_owner(uuid), public.shares_circle_with(uuid) to authenticated;

-- Live updates for sync (Supabase only).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.records;
  end if;
end $$;
