// Supabase Edge Function: send-reminders
// Called by pg_cron at 7:00 / 13:00 / 19:00 IST. Sends "N orders pending"
// to every subscribed device. Sends nothing when 0 pending.
//
// Uses @block65/webcrypto-web-push (pure Web Crypto) because Node's
// `web-push` package does not bundle on the edge runtime.
//
// Deploy:  supabase functions deploy send-reminders --no-verify-jwt
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildPushPayload,
  type PushSubscription,
} from "npm:@block65/webcrypto-web-push@1";

Deno.serve(async (req: Request) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { count, error: countErr } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (countErr) return new Response(countErr.message, { status: 500 });

  // 0 pending → stay silent.
  if (!count) return new Response(JSON.stringify({ sent: 0, pending: 0 }));

  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("*");
  if (subsErr) return new Response(subsErr.message, { status: 500 });

  const vapid = {
    subject: "mailto:admin@pallettrack.local",
    publicKey: Deno.env.get("VAPID_PUBLIC_KEY")!,
    privateKey: Deno.env.get("VAPID_PRIVATE_KEY")!,
  };

  const body = count === 1 ? "1 order pending" : `${count} orders pending`;
  const message = {
    data: JSON.stringify({ title: "PalletTrack", body }),
    options: { ttl: 6 * 60 * 60 },
  };

  let sent = 0;
  await Promise.allSettled(
    (subs ?? []).map(async (sub) => {
      try {
        const subscription: PushSubscription = {
          endpoint: sub.endpoint,
          expirationTime: null,
          keys: sub.keys,
        };
        const payload = await buildPushPayload(message, subscription, vapid);
        const res = await fetch(sub.endpoint, payload);
        if (res.status === 404 || res.status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else if (res.ok || res.status === 201) {
          sent++;
        }
      } catch {
        // one bad subscription must not stop the rest
      }
    })
  );

  return new Response(JSON.stringify({ sent, pending: count }));
});
