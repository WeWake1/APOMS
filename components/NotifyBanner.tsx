"use client";

import { useEffect, useState } from "react";
import { savePushSubscription } from "@/app/actions";
import { STR } from "@/lib/strings";

type Status =
  | "checking"
  | "unsupported" // no push API (iPhone browser tab, not installed)
  | "prompt" // supported, not yet subscribed → show the big banner
  | "denied"
  | "subscribed";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function NotifyBanner() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? "subscribed" : "prompt");
      } catch {
        setStatus("prompt");
      }
    }
    check();
  }, []);

  async function subscribe() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "prompt");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      if (res.ok) setStatus("subscribed");
    } catch {
      setStatus("prompt");
    }
  }

  if (status === "checking") return null;

  if (status === "subscribed") {
    return (
      <p className="mb-4 text-center text-base font-bold text-go">{STR.notifyOn}</p>
    );
  }

  if (status === "unsupported") {
    return (
      <p className="tag-card mb-4 px-4 py-3 text-base font-bold">
        {STR.notifyUnsupported}
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="tag-card mb-4 px-4 py-3 text-base font-bold text-stamp">
        {STR.notifyDeniedHelp}
      </p>
    );
  }

  // Big unmissable subscribe banner — stays until subscribed.
  return (
    <button
      type="button"
      onClick={subscribe}
      className="press mb-4 min-h-16 w-full rounded-2xl border-3 border-ink bg-stamp text-xl font-extrabold text-white"
    >
      {STR.notifyBanner}
    </button>
  );
}
