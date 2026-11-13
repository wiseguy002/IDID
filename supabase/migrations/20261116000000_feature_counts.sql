-- Opt-in anonymous feature counts.
--
-- People who turn on "Share anonymous counts" in Settings send, once a week, how many times they opened each
-- part of iDID the week before (screen names from a fixed list only, never anything they wrote).
-- The server keeps only running totals per feature per week: no user id, device id, IP address or timestamp
-- per submission is stored, so nothing here can be linked back to a person.

create table public.feature_counts (
  week text not null check (week ~ '^\d{4}-W\d{2}$'),
  feature text not null check (feature ~ '^[a-z][a-z-]{0,29}$'),
  -- Total uses that week across everyone who shared (each person's count is capped at 200 per feature).
  uses integer not null default 0 check (uses >= 0),
  -- How many people who shared used this feature at least once that week.
  people integer not null default 0 check (people >= 0),
  primary key (week, feature)
);

-- How many people shared counts each week (the denominator for "people").
create table public.feature_count_reports (
  week text primary key check (week ~ '^\d{4}-W\d{2}$'),
  reports integer not null default 0 check (reports >= 0)
);

alter table public.feature_counts enable row level security;
alter table public.feature_count_reports enable row level security;

-- Only app admins can read the totals; nobody can write to the tables directly.
create policy "admins read counts" on public.feature_counts for select to authenticated using (public.is_app_admin());
create policy "admins read reports" on public.feature_count_reports for select to authenticated using (public.is_app_admin());
revoke all on public.feature_counts, public.feature_count_reports from anon, authenticated;
grant select on public.feature_counts, public.feature_count_reports to authenticated;

-- Add one person's tally for one week. Works signed in or not; who called it is never recorded.
create function public.add_feature_counts(p_week text, p_counts jsonb) returns boolean
  language plpgsql security definer set search_path = public as $$
declare
  k text;
  v jsonb;
  n integer;
begin
  if p_week !~ '^\d{4}-W\d{2}$' then raise exception 'bad week'; end if;
  if jsonb_typeof(p_counts) <> 'object' then raise exception 'bad counts'; end if;
  if (select count(*) from jsonb_object_keys(p_counts)) > 60 then raise exception 'too many features'; end if;
  for k, v in select * from jsonb_each(p_counts) loop
    if k !~ '^[a-z][a-z-]{0,29}$' or jsonb_typeof(v) <> 'number' then raise exception 'bad feature'; end if;
    n := least(greatest((v #>> '{}')::numeric, 0), 200)::integer;
    if n > 0 then
      insert into public.feature_counts as fc (week, feature, uses, people) values (p_week, k, n, 1)
        on conflict (week, feature) do update set uses = fc.uses + excluded.uses, people = fc.people + 1;
    end if;
  end loop;
  insert into public.feature_count_reports as r (week, reports) values (p_week, 1)
    on conflict (week) do update set reports = r.reports + 1;
  return true;
end $$;

revoke execute on function public.add_feature_counts(text, jsonb) from public;
grant execute on function public.add_feature_counts(text, jsonb) to anon, authenticated;
