import "server-only";
import webpush from "web-push";
import { supabaseAdmin } from "./supabase";

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    "mailto:admin@pallettrack.local",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

/**
 * Send a push to every subscribed device. Dead subscriptions
 * (404/410 from the push service) are deleted as we go.
 * Never throws — a push failure must not fail order creation.
 */
export async function sendPushToAll(title: string, body: string): Promise<void> {
  try {
    configure();
    const supabase = supabaseAdmin();
    const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
    if (error || !subs?.length) return;

    const payload = JSON.stringify({ title, body });
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            payload
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      })
    );
  } catch (err) {
    console.error("sendPushToAll failed:", err);
  }
}
