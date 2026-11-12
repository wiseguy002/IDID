-- 0.8.0: "Check on me" alerts between circle members, and medication reminders.
-- Reminder rows hold only a time and a generic kind; what they're about stays encrypted on devices.
alter table public.reminders drop constraint reminders_kind_check;
alter table public.reminders add constraint reminders_kind_check
  check (kind in ('appointment', 'checkin', 'observation', 'kindness', 'tip', 'checkon', 'med'));

drop policy "schedule reminders" on public.reminders;
create policy "schedule reminders" on public.reminders for insert to authenticated
  with check (
    created_by = auth.uid() and sent_at is null
    and (user_id = auth.uid() or (kind in ('observation', 'checkon') and public.shares_circle_with(user_id)))
  );
