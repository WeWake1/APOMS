"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Order } from "@/lib/supabase";
import { STR } from "@/lib/strings";
import OrderCard from "@/components/OrderCard";
import DispatchedCard from "@/components/DispatchedCard";
import NotifyBanner from "@/components/NotifyBanner";
import PhotoViewer from "@/components/PhotoViewer";

export default function Board({
  pending,
  dispatched,
}: {
  pending: Order[];
  dispatched: Order[];
}) {
  const router = useRouter();
  const [viewerPhoto, setViewerPhoto] = useState<string | null>(null);
  const [showDispatched, setShowDispatched] = useState(false);

  // Live updates: listen on the public realtime "ping" channel (no order
  // data flows through it — we just refetch through the server), plus
  // refetch on tab focus and a slow poll as belt-and-braces.
  useEffect(() => {
    const refresh = () => router.refresh();

    let active = true;
    let channelCleanup: (() => void) | null = null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anonKey) {
      import("@supabase/supabase-js").then(({ createClient }) => {
        if (!active) return;
        const supabase = createClient(url, anonKey);
        const channel = supabase
          .channel("orders-ping")
          .on("broadcast", { event: "changed" }, refresh)
          .subscribe();
        channelCleanup = () => {
          channel.unsubscribe();
          supabase.removeAllChannels();
        };
      });
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const poll = setInterval(refresh, 30_000);

    return () => {
      active = false;
      channelCleanup?.();
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(poll);
    };
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col px-4 pb-28 pt-5">
      {/* Header */}
      <header className="mb-4 flex flex-col items-center gap-3">
        <h1 className="stencil text-2xl tracking-wide">{STR.appName}</h1>
        <div className="stamp stencil px-6 py-2 text-5xl" aria-live="polite">
          {pending.length} {STR.pending}
        </div>
      </header>

      <NotifyBanner />

      {/* Pending list */}
      {pending.length === 0 ? (
        <div className="tag-card mx-auto my-10 flex w-full flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="text-3xl font-extrabold text-go">{STR.noPending}</p>
          <p className="text-lg text-muted">{STR.noPendingSub}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-5">
          {pending.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onOpenPhoto={() => setViewerPhoto(order.photo_url)}
            />
          ))}
        </ul>
      )}

      {/* Recently dispatched */}
      {dispatched.length > 0 && (
        <section className="mt-8">
          <button
            type="button"
            onClick={() => setShowDispatched(!showDispatched)}
            className="w-full rounded-2xl border-3 border-dashed border-muted px-4 py-4 text-left text-xl font-bold text-muted"
          >
            {STR.recentlyDispatched} ({dispatched.length}) {showDispatched ? "▾" : "▸"}
          </button>
          {showDispatched && (
            <ul className="mt-4 flex flex-col gap-4">
              {dispatched.map((order) => (
                <DispatchedCard
                  key={order.id}
                  order={order}
                  onOpenPhoto={() => setViewerPhoto(order.photo_url)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Giant add button, always visible */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-120 px-4 pb-4">
        <Link
          href="/add"
          className="press flex min-h-16 w-full items-center justify-center rounded-2xl border-3 border-ink bg-ink text-2xl font-extrabold text-card"
        >
          {STR.newOrder}
        </Link>
      </div>

      {viewerPhoto && (
        <PhotoViewer src={viewerPhoto} onClose={() => setViewerPhoto(null)} />
      )}
    </main>
  );
}
