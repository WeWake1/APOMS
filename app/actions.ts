"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AUTH_COOKIE, isValidAuthCookie, makeAuthCookieValue } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendPushToAll } from "@/lib/push";
import { STR } from "@/lib/strings";

async function requireAuth(): Promise<void> {
  const jar = await cookies();
  if (!(await isValidAuthCookie(jar.get(AUTH_COOKIE.name)?.value))) {
    redirect("/pin");
  }
}

// ---------------------------------------------------------------- PIN

// In-memory per-IP failure counter. Adds a growing delay so the PIN
// can't be brute-forced. Resets on success or server restart.
const pinFailures = new Map<string, { count: number; last: number }>();

export async function verifyPin(pin: string): Promise<{ ok: boolean }> {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const entry = pinFailures.get(ip) ?? { count: 0, last: 0 };

  // Growing delay after failures: 1s, 2s, ... capped at 8s.
  if (entry.count > 0) {
    await new Promise((r) => setTimeout(r, Math.min(entry.count * 1000, 8000)));
  }

  if (pin !== process.env.APP_PIN) {
    pinFailures.set(ip, { count: entry.count + 1, last: Date.now() });
    return { ok: false };
  }

  pinFailures.delete(ip);
  const jar = await cookies();
  jar.set(AUTH_COOKIE.name, await makeAuthCookieValue(), {
    ...AUTH_COOKIE.options,
    maxAge: AUTH_COOKIE.maxAge,
  });
  return { ok: true };
}

// ---------------------------------------------------------------- Orders

export async function createOrder(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();
  const supabase = supabaseAdmin();

  const photo = formData.get("photo") as File | null;
  if (!photo || photo.size === 0) return { ok: false, error: "photo required" };

  const customer = ((formData.get("customer") as string) || "").trim() || null;
  const voice = formData.get("voice") as File | null;
  const voiceDuration = Number(formData.get("voiceDuration") || 0) || null;

  try {
    const id = crypto.randomUUID();

    const photoPath = `${id}.jpg`;
    const { error: photoErr } = await supabase.storage
      .from("order-photos")
      .upload(photoPath, photo, { contentType: photo.type || "image/jpeg" });
    if (photoErr) throw photoErr;
    const photoUrl = supabase.storage.from("order-photos").getPublicUrl(photoPath).data.publicUrl;

    let voiceUrl: string | null = null;
    if (voice && voice.size > 0) {
      const ext = (voice.type || "").includes("mp4") ? "mp4" : "webm";
      const voicePath = `${id}.${ext}`;
      const { error: voiceErr } = await supabase.storage
        .from("order-voices")
        .upload(voicePath, voice, { contentType: voice.type || "audio/webm" });
      if (voiceErr) throw voiceErr;
      voiceUrl = supabase.storage.from("order-voices").getPublicUrl(voicePath).data.publicUrl;
    }

    const { data: row, error: insertErr } = await supabase
      .from("orders")
      .insert({
        id,
        customer_name: customer,
        photo_url: photoUrl,
        voice_url: voiceUrl,
        voice_duration: voiceDuration,
      })
      .select("order_no")
      .single();
    if (insertErr) throw insertErr;

    // Instant push to every device. Must never fail the save.
    await sendPushToAll(STR.appName, STR.pushNewOrder(row.order_no, customer));

    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("createOrder failed:", err);
    return { ok: false, error: "upload failed" };
  }
}

export async function dispatchOrder(id: string): Promise<{ ok: boolean }> {
  await requireAuth();
  const { error } = await supabaseAdmin()
    .from("orders")
    .update({ status: "dispatched", dispatched_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("dispatchOrder failed:", error);
    return { ok: false };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function undoDispatch(id: string): Promise<{ ok: boolean }> {
  await requireAuth();
  const { error } = await supabaseAdmin()
    .from("orders")
    .update({ status: "pending", dispatched_at: null })
    .eq("id", id);
  if (error) {
    console.error("undoDispatch failed:", error);
    return { ok: false };
  }
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------- Push

export async function savePushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok: boolean }> {
  await requireAuth();
  const { error } = await supabaseAdmin()
    .from("push_subscriptions")
    .upsert({ endpoint: sub.endpoint, keys: sub.keys }, { onConflict: "endpoint" });
  if (error) {
    console.error("savePushSubscription failed:", error);
    return { ok: false };
  }
  return { ok: true };
}
