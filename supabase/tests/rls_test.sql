-- Run after auth_stub.sql and the migration. Fails loudly on any violated expectation.
\set ON_ERROR_STOP on
insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@example.test');

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('role', 'authenticated', false); perform set_config('request.jwt.claim.sub', u, false); end $$;
create function pg_temp.expect_error(q text, label text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then raise notice 'ok (blocked): %', label; return; end;
  raise exception 'EXPECTED FAILURE BUT SUCCEEDED: %', label;
end $$;
create function pg_temp.expect(cond boolean, label text) returns void language plpgsql as $$
begin if cond then raise notice 'ok: %', label; else raise exception 'FAILED: %', label; end if; end $$;

-- Alice: profile + circle + a record
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.profiles (id, public_key, wrapped_private_key, key_salt, sealed_personal_key)
  values (auth.uid(), '{"kty":"EC"}', 'v1.x.y', 'salt', 's1.x.y');
select public.create_circle('s1.alice-key') as cid \gset
select pg_temp.expect((select count(*) = 1 from public.circles), 'alice sees her circle');
select pg_temp.expect((select role = 'owner' from public.circle_members where user_id = auth.uid()), 'alice is owner');
insert into public.records (circle_id, rid, ct) values (:'cid', 'rid-0000000000000001', 'v1.iv.ct');
select seq as seq1 from public.records where rid = 'rid-0000000000000001' \gset
update public.records set ct = 'v1.iv.ct2' where rid = 'rid-0000000000000001';
select pg_temp.expect((select seq > :seq1 from public.records where rid = 'rid-0000000000000001'), 'update bumps seq');
select pg_temp.expect_error(format($q$insert into public.records (circle_id, rid, ct, updated_by) values (%L, 'rid-0000000000000002', 'x', '00000000-0000-0000-0000-00000000000b')$q$, :'cid'), 'cannot write as someone else');
insert into public.invites (circle_id, wrapped_circle_key) values (:'cid', 'v1.wrapped') returning id as inv \gset
insert into public.invites (circle_id, wrapped_circle_key, expires_at) values (:'cid', 'v1.wrapped', now() - interval '1 minute') returning id as expired \gset
select pg_temp.expect_error(format($q$insert into public.invites (circle_id, wrapped_circle_key, expires_at) values (%L, 'x', now() + interval '90 days')$q$, :'cid'), 'invite lifetime capped');

-- Bob: outsider
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) = 0 from public.circles), 'outsider sees no circles');
select pg_temp.expect((select count(*) = 0 from public.records), 'outsider sees no records');
select pg_temp.expect((select count(*) = 0 from public.circle_members), 'outsider sees no members');
select pg_temp.expect((select count(*) = 0 from public.profiles), 'cannot read others profiles');
select pg_temp.expect((select count(*) = 0 from public.invites), 'outsider cannot list invites');
select pg_temp.expect_error(format($q$insert into public.records (circle_id, rid, ct) values (%L, 'rid-0000000000000003', 'x')$q$, :'cid'), 'outsider cannot write records');
select pg_temp.expect_error(format($q$insert into public.circle_members (circle_id, user_id, sealed_circle_key) values (%L, auth.uid(), 'x')$q$, :'cid'), 'cannot add self to circle directly');
update public.records set ct = 'vandal' where circle_id = :'cid';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select ct = 'v1.iv.ct2' from public.records where rid = 'rid-0000000000000001'), 'outsider update had no effect');

-- Bob joins with the invite
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) = 1 from public.get_invite(:'inv')), 'invitee can look up invite');
select pg_temp.expect((select count(*) = 0 from public.get_invite(:'expired')), 'expired invite hidden');
select pg_temp.expect_error(format($q$select public.accept_invite(%L, 's1.bob')$q$, :'expired'), 'expired invite rejected');
select public.accept_invite(:'inv', 's1.bob-key');
select pg_temp.expect((select count(*) = 1 from public.records), 'member reads records');
select pg_temp.expect((select count(*) = 2 from public.circle_members), 'member sees members');
delete from public.circles where id = :'cid';
select pg_temp.expect((select count(*) = 1 from public.circles), 'circle still there');

-- Carol cannot reuse the invite
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error(format($q$select public.accept_invite(%L, 's1.carol')$q$, :'inv'), 'used invite rejected');

-- Reminders
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.reminders (user_id, kind, fire_at, tag) values ('00000000-0000-0000-0000-00000000000a', 'observation', now(), 'obs-1');
select pg_temp.expect_error($q$insert into public.reminders (user_id, kind, fire_at, tag) values ('00000000-0000-0000-0000-00000000000a', 'appointment', now(), 'ap-1')$q$, 'cannot schedule appointment reminders for others');
select pg_temp.expect_error($q$insert into public.reminders (user_id, kind, fire_at, tag) values ('00000000-0000-0000-0000-00000000000c', 'observation', now(), 'obs-2')$q$, 'cannot notify people outside your circles');
insert into public.reminders (user_id, kind, fire_at, tag, minutes_before) values (auth.uid(), 'appointment', now() + interval '1 day', 'ap-own', 60);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) = 0 from public.reminders), 'cannot see others reminders');

-- ---------- Check on me & medication reminders ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.reminders (user_id, kind, fire_at, tag) values ('00000000-0000-0000-0000-00000000000a', 'checkon', now(), 'checkon-1');
insert into public.reminders (user_id, kind, fire_at, tag) values (auth.uid(), 'med', now() + interval '1 hour', 'med-1');
select pg_temp.expect_error($q$insert into public.reminders (user_id, kind, fire_at, tag) values ('00000000-0000-0000-0000-00000000000a', 'med', now(), 'med-x')$q$, 'cannot set medication reminders for others');
select pg_temp.expect_error($q$insert into public.reminders (user_id, kind, fire_at, tag) values ('00000000-0000-0000-0000-00000000000c', 'checkon', now(), 'checkon-x')$q$, 'cannot ask people outside your circles to check on you');
select pg_temp.expect_error($q$insert into public.reminders (user_id, kind, fire_at, tag) values (auth.uid(), 'nonsense', now(), 'z')$q$, 'unknown reminder kinds rejected');

-- Owner removes member; removed member loses access
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
delete from public.circle_members where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($q$insert into public.reminders (user_id, kind, fire_at, tag) values ('00000000-0000-0000-0000-00000000000a', 'checkon', now(), 'checkon-after')$q$, 'removed member can no longer send check-on alerts');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) = 0 from public.records), 'removed member loses access');

-- ---------- Kind notes ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select public.send_kindness(3, 'sun') = false), 'no recipients yet: nothing sent');
insert into public.kindness_optin (receive) values (true);
select pg_temp.expect((select public.send_kindness(3, 'sun') = false), 'cannot send to yourself');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.kindness_optin (receive) values (true);
select pg_temp.expect((select public.send_kindness(7, 'flower')), 'carol sends a kind note');
select pg_temp.expect((select public.send_kindness(8, 'star') = false), 'not the same person twice in a week');
select pg_temp.expect_error($q$select public.send_kindness(500, 'sun')$q$, 'only curated messages');
select pg_temp.expect_error($q$select public.send_kindness(1, 'skull')$q$, 'only curated icons');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select count(*) = 1 from public.kind_notes), 'alice received one note');
select pg_temp.expect((select message_id = 7 from public.kind_notes), 'alice reads the message');
select pg_temp.expect_error('select sender_id from public.kind_notes', 'recipient cannot see the sender');
select pg_temp.expect_error('select * from public.kind_notes', 'recipient cannot select all columns');
update public.kind_notes set read_at = now();
select pg_temp.expect_error($q$update public.kind_notes set message_id = 1$q$, 'recipient cannot change the note');
select pg_temp.expect((select count(*) = 1 from public.reminders where kind = 'kindness'), 'push queued for recipient');
select pg_temp.expect_error($q$insert into public.kind_notes (recipient_id, message_id, icon) values ('00000000-0000-0000-0000-00000000000c', 1, 'sun')$q$, 'no direct inserts');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) = 0 from public.kind_notes), 'sender cannot read sent notes');
update public.kindness_optin set receive = false;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select public.send_kindness(2, 'leaf') = false), 'opted-out people receive nothing');

-- ---------- Feature requests ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.feedback (kind, title, details, app_version) values ('feature', 'Sleep tracking', 'Would help me', '0.7.0') returning id as fb \gset
select pg_temp.expect_error($q$insert into public.feedback (kind, title, status) values ('idea', 'Sneaky', 'done')$q$, 'cannot set own status');
select pg_temp.expect_error($q$insert into public.feedback (kind, title, created_by) values ('idea', 'Spoof', '00000000-0000-0000-0000-00000000000a')$q$, 'cannot submit as someone else');
select pg_temp.expect_error($q$insert into public.feedback (kind, title) values ('idea', 'x')$q$, 'title too short');
update public.feedback set status = 'done';
select pg_temp.expect((select status = 'new' from public.feedback where id = :'fb'), 'submitter cannot change status');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) = 0 from public.feedback), 'others cannot read requests');
select pg_temp.expect((select not public.is_app_admin()), 'carol is not an admin');
reset role;
insert into public.app_admins values ('00000000-0000-0000-0000-00000000000c');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select public.is_app_admin()), 'carol is now an admin');
select pg_temp.expect((select count(*) = 1 from public.feedback), 'admin sees all requests');
update public.feedback set status = 'planned', admin_note = 'Great idea, planned for 0.8' where id = :'fb';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select status = 'planned' and admin_note like 'Great%' from public.feedback where id = :'fb'), 'submitter sees the reply');
select pg_temp.expect_error('select * from public.app_admins', 'admin list is private');

-- ---------- Deleting an account ----------
-- Records someone last edited stay in the circle when their account is deleted (by an admin, so no signed-in user).
reset role; select set_config('request.jwt.claim.sub', '', false);
insert into auth.users values ('00000000-0000-0000-0000-00000000000d', 'dee@example.test');
insert into public.records (circle_id, rid, ct, updated_by) values (:'cid', 'rid-dee-0000000000001', 'v1.ciphertext', '00000000-0000-0000-0000-00000000000d');
delete from auth.users where id = '00000000-0000-0000-0000-00000000000d';
select pg_temp.expect((select updated_by is null from public.records where rid = 'rid-dee-0000000000001'), 'deleting an account keeps records it edited');

-- ---------- Per-person access: view-only members ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.invites (circle_id, wrapped_circle_key, role) values (:'cid', 'v1.wrapped', 'viewer') returning id as vinv \gset
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.accept_invite(:'vinv', 's1.carol-key');
select pg_temp.expect((select role = 'viewer' from public.circle_members where user_id = auth.uid() and circle_id = :'cid'), 'view-only invite makes a viewer');
select pg_temp.expect((select count(*) >= 1 from public.records where circle_id = :'cid'), 'viewer can read records');
select pg_temp.expect_error(format($q$insert into public.records (circle_id, rid, ct) values (%L, 'rid-viewer-000000001', 'x')$q$, :'cid'), 'viewer cannot add records');
update public.records set ct = 'viewer-edit' where circle_id = :'cid';
select pg_temp.expect((select count(*) = 0 from public.records where ct = 'viewer-edit'), 'viewer cannot change records');
select pg_temp.expect_error(format($q$insert into public.invites (circle_id, wrapped_circle_key) values (%L, 'x')$q$, :'cid'), 'viewer cannot invite');
select pg_temp.expect_error($q$update public.circle_members set role = 'member' where user_id = auth.uid()$q$, 'viewer cannot promote themselves');
select pg_temp.expect_error(format($q$select public.set_member_role(%L, auth.uid(), 'member')$q$, :'cid'), 'only the owner changes access');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.set_member_role(:'cid', '00000000-0000-0000-0000-00000000000c', 'member');
select pg_temp.expect_error(format($q$select public.set_member_role(%L, auth.uid(), 'viewer')$q$, :'cid'), 'owner role cannot be changed');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.records (circle_id, rid, ct) values (:'cid', 'rid-carol-0000000001', 'v1.carol');
select pg_temp.expect((select count(*) = 1 from public.records where rid = 'rid-carol-0000000001'), 'after the owner allows it, carol can add');
select pg_temp.expect_error(format($q$insert into public.invites (circle_id, wrapped_circle_key, role) values (%L, 'x', 'viewer')$q$, :'cid'), 'only the owner makes view-only invites');

-- ---------- Handing the circle to someone else ----------
-- Carol is a member of Alice's circle by now (made a member above).
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error(format($q$select public.transfer_ownership(%L, auth.uid())$q$, :'cid'), 'a member cannot take the circle');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error(format($q$select public.transfer_ownership(%L, '00000000-0000-0000-0000-00000000000d')$q$, :'cid'), 'cannot hand it to someone outside the circle');
select pg_temp.expect_error(format($q$select public.transfer_ownership(%L, auth.uid())$q$, :'cid'), 'cannot hand it to yourself');
select public.transfer_ownership(:'cid', '00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select role = 'member' from public.circle_members where circle_id = :'cid' and user_id = auth.uid()), 'previous owner stays as a member');
select pg_temp.expect((select count(*) = 1 from public.records where circle_id = :'cid' and rid = 'rid-0000000000000001'), 'previous owner can still read');
select pg_temp.expect_error(format($q$select public.set_member_role(%L, '00000000-0000-0000-0000-00000000000c', 'viewer')$q$, :'cid'), 'previous owner can no longer change access');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select role = 'owner' from public.circle_members where circle_id = :'cid' and user_id = auth.uid()), 'new owner is the owner');
select pg_temp.expect((select count(*) = 1 from public.circle_members where circle_id = :'cid' and role = 'owner'), 'exactly one owner');
select pg_temp.expect((select created_by = auth.uid() from public.circles where id = :'cid'), 'the circle belongs to the new owner');
select public.set_member_role(:'cid', '00000000-0000-0000-0000-00000000000a', 'viewer');
select pg_temp.expect((select role = 'viewer' from public.circle_members where circle_id = :'cid' and user_id = '00000000-0000-0000-0000-00000000000a'), 'new owner manages access');
select public.set_member_role(:'cid', '00000000-0000-0000-0000-00000000000a', 'member');
select public.transfer_ownership(:'cid', '00000000-0000-0000-0000-00000000000a');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');

-- ---------- Care team shares ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.care_shares (ct) values ('') returning id as cs \gset
update public.care_shares set ct = 'v1.iv.summary' where id = :'cs';
select pg_temp.expect((select ct = 'v1.iv.summary' and views = 0 from public.care_shares where id = :'cs'), 'owner reads and updates own share');
select pg_temp.expect_error($q$update public.care_shares set views = 99$q$, 'owner cannot fake view counts');
select pg_temp.expect_error($q$insert into public.care_shares (ct, owner_id) values ('x', '00000000-0000-0000-0000-00000000000b')$q$, 'cannot create a share for someone else');
insert into public.care_shares (ct, expires_at) values ('v1.old', now() - interval '1 day') returning id as cs_old \gset
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) = 0 from public.care_shares), 'others cannot see shares');
update public.care_shares set ct = 'hijack';
delete from public.care_shares;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select count(*) = 2 and bool_and(ct <> 'hijack') from public.care_shares), 'others cannot change or delete shares');

-- Anonymous
reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;
select pg_temp.expect_error('select * from public.records', 'anon cannot read records');
select pg_temp.expect_error($q$select public.get_invite(gen_random_uuid())$q$, 'anon cannot call functions');
select pg_temp.expect_error($q$select public.send_kindness(1, 'sun')$q$, 'anon cannot send kind notes');
select pg_temp.expect_error('select * from public.feedback', 'anon cannot read requests');
select pg_temp.expect_error('select * from public.care_shares', 'anon cannot list care shares');
select pg_temp.expect((select ct = 'v1.iv.summary' from public.get_care_share(:'cs')), 'a care link opens its summary');
select pg_temp.expect((select count(*) = 0 from public.get_care_share(:'cs_old')), 'expired care links show nothing');
select pg_temp.expect((select count(*) = 0 from public.get_care_share(gen_random_uuid())), 'unknown care links show nothing');
reset role;
select pg_temp.expect((select views = 1 and last_viewed_at is not null from public.care_shares where id = :'cs'), 'opening a link is counted');
delete from public.care_shares where id = :'cs';
set role anon;
select pg_temp.expect((select count(*) = 0 from public.get_care_share(:'cs')), 'removed care links stop working');
reset role;
\echo ALL RLS TESTS PASSED
