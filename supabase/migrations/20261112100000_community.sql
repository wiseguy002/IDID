-- Community features: anonymous kind notes and feature requests.
-- These hold no journal content, so they are not end-to-end encrypted.
-- Kind notes use only a message number from the app's curated list (no free text).

-- Reminders can now also announce kind notes and weekly feature suggestions.
alter table public.reminders drop constraint reminders_kind_check;
alter table public.reminders add constraint reminders_kind_check
  check (kind in ('appointment', 'checkin', 'observation', 'kindness', 'tip'));

-- ---------- Kind notes ----------

create table public.kindness_optin (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  receive boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.kind_notes (
  id uuid primary key default gen_random_uuid(),
  -- Kept only for rate limits and abuse handling; recipients can never read it (see grants below).
  sender_id uuid references auth.users (id) on delete set null,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  message_id integer not null check (message_id between 0 and 199),
  icon text not null check (icon in ('sun', 'flower', 'star', 'heart', 'leaf', 'sparkle')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index kind_notes_recipient_idx on public.kind_notes (recipient_id, created_at desc);
create index kind_notes_sender_idx on public.kind_notes (sender_id, created_at desc);

alter table public.kindness_optin enable row level security;
alter table public.kind_notes enable row level security;

create policy "own opt-in" on public.kindness_optin for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read my notes" on public.kind_notes for select to authenticated using (recipient_id = auth.uid());
create policy "mark my notes read" on public.kind_notes for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

grant select, insert, update, delete on public.kindness_optin to authenticated;
-- Column-level grants: recipients can read the note but never who sent it.
grant select (id, message_id, icon, created_at, read_at) on public.kind_notes to authenticated;
grant update (read_at) on public.kind_notes to authenticated;

-- Send a kind note to a random person who has opted in. Returns false when nobody
-- can receive one right now. Limits: 5 sent per person per day; 3 received per day.
create function public.send_kindness(message_id integer, icon text) returns boolean
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
  insert into public.reminders (user_id, created_by, kind, fire_at, tag) values (target, me, 'kindness', now(), 'kind-' || nid);
  return true;
end $$;
grant execute on function public.send_kindness(integer, text) to authenticated;

-- ---------- Feature requests ----------

create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.app_admins enable row level security;
-- Add yourself once, in the SQL editor: insert into public.app_admins select id from auth.users where email = 'you@example.com';

create function public.is_app_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;
grant execute on function public.is_app_admin() to authenticated;

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  kind text not null check (kind in ('feature', 'idea', 'service', 'improvement', 'problem', 'other')),
  title text not null check (char_length(title) between 3 and 140),
  details text not null default '' check (char_length(details) <= 4000),
  app_version text check (char_length(app_version) <= 20),
  status text not null default 'new' check (status in ('new', 'reviewing', 'planned', 'in-progress', 'done', 'declined')),
  admin_note text check (char_length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index feedback_status_idx on public.feedback (status, created_at desc);
alter table public.feedback enable row level security;

create policy "submit requests" on public.feedback for insert to authenticated
  with check (created_by = auth.uid() and status = 'new' and admin_note is null);
create policy "see own requests or all as admin" on public.feedback for select to authenticated
  using (created_by = auth.uid() or public.is_app_admin());
create policy "admins manage requests" on public.feedback for update to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());
create policy "admins delete requests" on public.feedback for delete to authenticated using (public.is_app_admin());
grant select, insert, update, delete on public.feedback to authenticated;

-- At most 10 requests per person per day (spam protection), and keep updated_at fresh.
create function public.feedback_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and (select count(*) from public.feedback where created_by = new.created_by and created_at > now() - interval '1 day') >= 10 then
    raise exception 'daily limit reached';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger feedback_guard before insert or update on public.feedback for each row execute function public.feedback_guard();

-- New functions are executable by PUBLIC by default; only signed-in users may call these.
revoke execute on function public.send_kindness(integer, text), public.is_app_admin(), public.feedback_guard() from public, anon;
revoke all on public.kindness_optin, public.kind_notes, public.app_admins, public.feedback from anon;
