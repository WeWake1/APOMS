-- pg_cron schedules. Run AFTER deploying both edge functions and setting
-- the CRON_SECRET edge-function secret.
--
-- Replace <PROJECT_REF> with your Supabase project ref and
-- <CRON_SECRET> with the same value you set as the edge function secret.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reminder pushes at 7:00, 13:00, 19:00 IST (= 01:30, 07:30, 13:30 UTC).
select cron.schedule(
  'send-reminders-morning',
  '30 1 * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
       headers := '{"x-cron-secret": "<CRON_SECRET>"}'::jsonb
     ) $$
);

select cron.schedule(
  'send-reminders-noon',
  '30 7 * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
       headers := '{"x-cron-secret": "<CRON_SECRET>"}'::jsonb
     ) $$
);

select cron.schedule(
  'send-reminders-evening',
  '30 13 * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
       headers := '{"x-cron-secret": "<CRON_SECRET>"}'::jsonb
     ) $$
);

-- Daily cleanup of orders dispatched > 3 days ago (2:30 AM IST).
select cron.schedule(
  'cleanup-dispatched',
  '0 21 * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cleanup-dispatched',
       headers := '{"x-cron-secret": "<CRON_SECRET>"}'::jsonb
     ) $$
);
