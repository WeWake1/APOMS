"use client";

import { useEffect, useState } from "react";
import { STR } from "@/lib/strings";

type Status =
  | "hidden" // already installed (standalone) or still checking
  | "prompt" // browser gave us an install prompt → button triggers it
  | "manual" // no prompt API (iPhone Safari etc.) → button shows steps
  | "help"; // manual steps expanded

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallBanner() {
  const [status, setStatus] = useState<Status>("hidden");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    async function check() {
      // Opened from the Home Screen icon → nothing to install.
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // iOS Safari's non-standard flag
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (!standalone) setStatus("manual");
    }
    check();

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setStatus("prompt");
    };
    const onInstalled = () => setStatus("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setStatus("hidden");
      setDeferred(null);
      if (outcome !== "accepted") setStatus("manual");
      return;
    }
    setStatus("help");
  }

  if (status === "hidden") return null;

  if (status === "help") {
    return (
      <p className="tag-card mb-4 px-4 py-3 text-base font-bold">
        {isIos() ? STR.installIosHelp : STR.installHelp}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={install}
      className="press mb-4 min-h-16 w-full rounded-2xl border-3 border-ink bg-ink text-xl font-extrabold text-card"
    >
      {STR.installBanner}
    </button>
  );
}
