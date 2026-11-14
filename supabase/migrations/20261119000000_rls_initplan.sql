-- Faster row-level security at scale (Supabase performance advisor: auth_rls_initplan). No behavior change.
--
-- Writing (select auth.uid()) instead of auth.uid() lets Postgres work out the signed-in user once per query
-- rather than once per row. Each policy keeps exactly the same rule; only that call changes.

alter policy "own care shares" on public.care_shares
  using ((owner_id = (select auth.uid())))
  with check ((owner_id = (select auth.uid())));
alter policy "leave or remove" on public.circle_members
  using (((user_id = (select auth.uid())) OR is_circle_owner(circle_id)));
alter policy "update own key" on public.circle_members
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));
alter policy "see own requests or all as admin" on public.feedback
  using (((created_by = (select auth.uid())) OR is_app_admin()));
alter policy "submit requests" on public.feedback
  with check (((created_by = (select auth.uid())) AND (status = 'new'::text) AND (admin_note IS NULL)));
alter policy "members create invites" on public.invites
  with check ((is_circle_writer(circle_id) AND (created_by = (select auth.uid())) AND (used_by IS NULL) AND (used_at IS NULL) AND (expires_at <= (now() + '30 days'::interval)) AND ((role = 'member'::text) OR is_circle_owner(circle_id))));
alter policy "mark my notes read" on public.kind_notes
  using ((recipient_id = (select auth.uid())))
  with check ((recipient_id = (select auth.uid())));
alter policy "read my notes" on public.kind_notes
  using ((recipient_id = (select auth.uid())));
alter policy "own opt-in" on public.kindness_optin
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));
alter policy "own profile" on public.profiles
  using ((id = (select auth.uid())))
  with check ((id = (select auth.uid())));
alter policy "own push subscriptions" on public.push_subscriptions
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));
alter policy "members write records" on public.records
  with check ((is_circle_writer(circle_id) AND (updated_by = (select auth.uid()))));
alter policy "cancel own reminders" on public.reminders
  using ((((user_id = (select auth.uid())) OR (created_by = (select auth.uid()))) AND (sent_at IS NULL)));
alter policy "schedule reminders" on public.reminders
  with check (((created_by = (select auth.uid())) AND (sent_at IS NULL) AND ((user_id = (select auth.uid())) OR ((kind = ANY (ARRAY['observation'::text, 'checkon'::text])) AND shares_circle_with(user_id)))));
alter policy "see own reminders" on public.reminders
  using (((user_id = (select auth.uid())) OR (created_by = (select auth.uid()))));
