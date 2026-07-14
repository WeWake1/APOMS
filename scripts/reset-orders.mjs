// Wipes ALL orders (pending and dispatched), deletes every photo and
// voice file from storage, and restarts order numbering at #1.
//
// Run: npm run reset-orders
//
// Reads .env.local for the Supabase URL + service-role key.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function emptyBucket(bucket) {
  let total = 0;
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list("", { limit: 100 });
    if (error) throw new Error(`${bucket}: ${error.message}`);
    if (!data?.length) break;
    const names = data.map((f) => f.name);
    const { error: rmErr } = await supabase.storage.from(bucket).remove(names);
    if (rmErr) throw new Error(`${bucket}: ${rmErr.message}`);
    total += names.length;
  }
  console.log(`${bucket}: deleted ${total} file(s)`);
}

await emptyBucket("order-photos");
await emptyBucket("order-voices");

const { error } = await supabase.rpc("reset_orders");
if (error) {
  console.error("reset_orders failed:", error.message);
  process.exit(1);
}
console.log("orders wiped — next order will be #1");
