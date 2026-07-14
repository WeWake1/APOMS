"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyPin } from "@/app/actions";
import { STR } from "@/lib/strings";

// No ENTER button: the pad verifies automatically the moment the full
// PIN length is typed. Correct → straight to the board.
export default function PinPad({ pinLength }: { pinLength: number }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [wrong, setWrong] = useState(false);

  async function tap(digit: string) {
    if (checking) return;
    setWrong(false);
    const next = pin + digit;
    setPin(next);
    if (next.length < pinLength) return;

    setChecking(true);
    const res = await verifyPin(next);
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setPin("");
      setWrong(true);
      setChecking(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10">
      <h1 className="stencil text-4xl">{STR.appName}</h1>
      <p className="text-xl font-bold">{STR.pinTitle}</p>

      {/* PIN dots */}
      <div className="flex h-10 items-center gap-4" aria-live="polite">
        {Array.from({ length: pinLength }).map((_, i) => (
          <span
            key={i}
            className={`h-5 w-5 rounded-full border-3 border-ink ${
              i < pin.length ? "bg-ink" : "bg-transparent"
            } ${checking ? "animate-pulse" : ""}`}
          />
        ))}
      </div>

      {wrong && (
        <p className="rounded-lg bg-stamp-soft px-4 py-2 text-lg font-bold text-stamp">
          {STR.pinWrong}
        </p>
      )}

      {/* Keypad */}
      <div className="grid w-full max-w-80 grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => tap(d)}
            disabled={checking}
            className="tag-card press stencil min-h-16 text-3xl disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            if (checking) return;
            setPin("");
            setWrong(false);
          }}
          disabled={checking}
          className="tag-card press min-h-16 text-base font-extrabold disabled:opacity-50"
        >
          {STR.pinClear}
        </button>
        <button
          type="button"
          onClick={() => tap("0")}
          disabled={checking}
          className="tag-card press stencil min-h-16 text-3xl disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => {
            if (checking) return;
            setPin(pin.slice(0, -1));
            setWrong(false);
          }}
          disabled={checking}
          aria-label={STR.pinBackspace}
          className="tag-card press min-h-16 text-2xl font-extrabold disabled:opacity-50"
        >
          ⌫
        </button>
      </div>
    </main>
  );
}
