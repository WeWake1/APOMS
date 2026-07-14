import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Service-role client — server-side only. The client never talks to
// Supabase directly except for the read-only realtime "ping" channel.
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return client;
}

export type Order = {
  id: string;
  order_no: number;
  order_date: string;
  customer_name: string | null;
  photo_url: string;
  voice_url: string | null;
  voice_duration: number | null;
  status: "pending" | "dispatched";
  dispatched_at: string | null;
  created_at: string;
};

export async function fetchOrders(): Promise<{ pending: Order[]; dispatched: Order[] }> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const orders = (data ?? []) as Order[];
  return {
    pending: orders.filter((o) => o.status === "pending"),
    dispatched: orders.filter((o) => o.status === "dispatched"),
  };
}
