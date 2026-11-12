-- Run once in the Supabase SQL editor AFTER deploying the send-push function.
-- Replace YOUR-PROJECT-REF and YOUR-CRON-SECRET (the same value you set as the CRON_SECRET function secret).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'idid-send-push',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR-CRON-SECRET'),
    body := '{}'::jsonb
  );
  $$
);
