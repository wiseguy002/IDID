// Sends due reminders as Web Push notifications. Run it every minute (see ../../setup-cron.sql).
// Notification text is always generic: the server never knows what a reminder is about.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cronSecret = Deno.env.get('CRON_SECRET');
webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

function message(kind: string, minutesBefore: number | null) {
  if (kind === 'observation') return 'Someone in your circle wondered if you noticed something. Open IDID when you are ready.';
  if (kind === 'checkin') return 'A gentle check-in: how are you all doing?';
  const m = minutesBefore ?? 0;
  if (m === 0) return 'An appointment is starting now.';
  if (m < 60) return `You have an appointment in ${m} minutes.`;
  if (m < 1440) return `You have an appointment in ${m / 60} hour${m === 60 ? '' : 's'}.`;
  return m === 1440 ? 'You have an appointment tomorrow.' : `You have an appointment in ${m / 1440} days.`;
}

Deno.serve(async (req) => {
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) return new Response('forbidden', { status: 403 });
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const now = new Date();
  const { data: due, error } = await db.from('reminders')
    .select('id, user_id, kind, tag, minutes_before, fire_at')
    .is('sent_at', null).lte('fire_at', now.toISOString())
    .gte('fire_at', new Date(now.getTime() - 3600_000).toISOString()) // drop anything over an hour stale
    .order('fire_at').limit(500);
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;
  for (const r of due ?? []) {
    const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', r.user_id);
    const payload = JSON.stringify({ title: 'IDID', body: message(r.kind, r.minutes_before), tag: r.tag, kind: r.kind });
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: 'normal' });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('id', s.id); // subscription gone
      }
    }
    await db.from('reminders').update({ sent_at: now.toISOString() }).eq('id', r.id);
  }
  // Housekeeping: forget sent and stale reminders after a day.
  await db.from('reminders').delete().lt('fire_at', new Date(now.getTime() - 86400_000).toISOString());
  return Response.json({ due: due?.length ?? 0, sent });
});
