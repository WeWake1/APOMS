"use client";

import { useState, useTransition } from "react";
import type { Order } from "@/lib/supabase";
import { STR } from "@/lib/strings";
import { shortDate } from "@/lib/format";
import { undoDispatch } from "@/app/actions";
import ConfirmDialog from "@/components/ConfirmDialog";

// Grayed-out dispatched order with a big UNDO — the safety net for
// wrong taps. Auto-deleted after 3 days by the cleanup job.
export default function DispatchedCard({
  order,
  onOpenPhoto,
}: {
  order: Order;
  onOpenPhoto: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, startTransition] = useTransition();

  function confirmUndo() {
    startTransition(async () => {
      await undoDispatch(order.id);
      setConfirming(false);
    });
  }

  return (
    <li className="tag-card flex items-center gap-3 p-3 opacity-70">
      <button
        type="button"
        onClick={onOpenPhoto}
        className="w-20 shrink-0 overflow-hidden rounded-lg border-2 border-ink"
        aria-label={`Order ${order.order_no} photo`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={order.photo_url}
          alt={`Order ${order.order_no}`}
          className="aspect-square w-full object-cover grayscale"
          loading="lazy"
        />
      </button>

      <div className="min-w-0 flex-1">
        <p className="stencil text-3xl leading-none">#{order.order_no}</p>
        <p className="text-base font-bold text-muted">
          {shortDate(order.order_date)}
          {order.customer_name ? ` · ${order.customer_name}` : ""}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="press min-h-14 shrink-0 rounded-xl border-3 border-ink bg-card px-5 text-lg font-extrabold"
      >
        {STR.undo}
      </button>

      {confirming && (
        <ConfirmDialog
          title={STR.undoConfirmTitle(order.order_no)}
          yesLabel={STR.yesUndo}
          noLabel={STR.noGoBack}
          onYes={confirmUndo}
          onNo={() => setConfirming(false)}
          busy={busy}
        />
      )}
    </li>
  );
}
