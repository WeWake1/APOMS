"use client";

import { useState, useTransition } from "react";
import type { Order } from "@/lib/supabase";
import { STR } from "@/lib/strings";
import { shortDate } from "@/lib/format";
import { dispatchOrder } from "@/app/actions";
import VoicePlayer from "@/components/VoicePlayer";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function OrderCard({
  order,
  onOpenPhoto,
}: {
  order: Order;
  onOpenPhoto: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, startTransition] = useTransition();

  function confirmDispatch() {
    startTransition(async () => {
      await dispatchOrder(order.id);
      setConfirming(false);
    });
  }

  return (
    <li className="tag-card overflow-hidden">
      <div className="flex gap-3 p-3">
        {/* Photo — tap for full screen */}
        <button
          type="button"
          onClick={onOpenPhoto}
          className="w-[40%] shrink-0 overflow-hidden rounded-xl border-3 border-ink"
          aria-label={`Order ${order.order_no} photo`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={order.photo_url}
            alt={`Order ${order.order_no}`}
            className="aspect-square h-full w-full object-cover"
            loading="lazy"
          />
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <p className="stencil text-5xl leading-none text-stamp">
            #{order.order_no}
          </p>
          <p className="text-lg font-bold text-muted">{shortDate(order.order_date)}</p>
          {order.customer_name && (
            <p className="break-words text-xl font-extrabold leading-tight">
              {order.customer_name}
            </p>
          )}
        </div>
      </div>

      {order.voice_url && (
        <div className="px-3 pb-3">
          <VoicePlayer src={order.voice_url} duration={order.voice_duration} />
        </div>
      )}

      {/* Full-width dispatch button */}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-16 w-full border-t-3 border-ink bg-go text-2xl font-extrabold text-white active:bg-go-deep"
      >
        {STR.dispatched}
      </button>

      {confirming && (
        <ConfirmDialog
          title={STR.dispatchConfirmTitle(order.order_no)}
          yesLabel={STR.yesDispatched}
          noLabel={STR.noGoBack}
          onYes={confirmDispatch}
          onNo={() => setConfirming(false)}
          busy={busy}
        />
      )}
    </li>
  );
}
