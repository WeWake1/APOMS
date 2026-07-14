// Supabase Edge Function: cleanup-dispatched
// Called by pg_cron daily. Orders dispatched more than 3 days ago:
// delete their photo + voice files from Storage, then delete the rows.
// Nothing is kept forever.
//
// Deploy:  supabase functions deploy cleanup-dispatched --no-verify-jwt
// Secrets: CRON_SECRET

import { createClient } from "npm:@supabase/supabase-js@2";

function pathFromPublicUrl(url: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: old, error } = await supabase
    .from("orders")
    .select("id, photo_url, voice_url")
    .eq("status", "dispatched")
    .lt("dispatched_at", cutoff);
  if (error) return new Response(error.message, { status: 500 });
  if (!old?.length) return new Response(JSON.stringify({ deleted: 0 }));

  const photoPaths = old
    .map((o) => pathFromPublicUrl(o.photo_url, "order-photos"))
    .filter((p): p is string => !!p);
  const voicePaths = old
    .map((o) => (o.voice_url ? pathFromPublicUrl(o.voice_url, "order-voices") : null))
    .filter((p): p is string => !!p);

  if (photoPaths.length) await supabase.storage.from("order-photos").remove(photoPaths);
  if (voicePaths.length) await supabase.storage.from("order-voices").remove(voicePaths);

  const { error: delErr } = await supabase
    .from("orders")
    .delete()
    .in("id", old.map((o) => o.id));
  if (delErr) return new Response(delErr.message, { status: 500 });

  return new Response(JSON.stringify({ deleted: old.length }));
});
