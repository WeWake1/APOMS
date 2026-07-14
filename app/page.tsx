import { fetchOrders } from "@/lib/supabase";
import Board from "@/components/Board";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { pending, dispatched } = await fetchOrders();
  return <Board pending={pending} dispatched={dispatched} />;
}
