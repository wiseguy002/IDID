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

-- Owner removes member; removed member loses access
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
delete from public.circle_members where user_id = '00000000-0000-0000-0000-00000000000b';
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

-- Anonymous
reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;
select pg_temp.expect_error('select * from public.records', 'anon cannot read records');
select pg_temp.expect_error($q$select public.get_invite(gen_random_uuid())$q$, 'anon cannot call functions');
select pg_temp.expect_error($q$select public.send_kindness(1, 'sun')$q$, 'anon cannot send kind notes');
select pg_temp.expect_error('select * from public.feedback', 'anon cannot read requests');
reset role;
\echo ALL RLS TESTS PASSED
