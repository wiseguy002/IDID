-- Deleting an account must not fail or rewrite history.
-- records.updated_by is cleared (on delete set null) when the person who last edited a record
-- deletes their account, so it has to allow null. The bump trigger also fires on that cascade;
-- with no signed-in user (an admin or the dashboard deleting the account) it now keeps the
-- cleared value instead of failing.
alter table public.records alter column updated_by drop not null;

create or replace function public.bump_record() returns trigger language plpgsql as $$
begin
  new.seq := nextval('public.records_seq');
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;
