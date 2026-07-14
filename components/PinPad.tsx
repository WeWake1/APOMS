"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyPin } from "@/app/actions";
import { STR } from "@/lib/strings";

const MAX_LEN = 6;

export default function PinPad() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [wrong, setWrong] = useState(false);

  function tap(digit: string) {
    setWrong(false);
    if (pin.length < MAX_LEN) setPin(pin + digit);
  }

  async function submit() {
    if (pin.length < 4 || checking) return;
    setChecking(true);
    const res = await verifyPin(pin);
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
        {Array.from({ length: MAX_LEN }).map((_, i) => (
          <span
            key={i}
            className={`h-5 w-5 rounded-full border-3 border-ink ${
              i < pin.length ? "bg-ink" : "bg-transparent"
            }`}
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
            className="tag-card press stencil min-h-16 text-3xl"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setPin("");
            setWrong(false);
          }}
          className="tag-card press min-h-16 text-base font-extrabold"
        >
          {STR.pinClear}
        </button>
        <button
          type="button"
          onClick={() => tap("0")}
          className="tag-card press stencil min-h-16 text-3xl"
        >
          0
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pin.length < 4 || checking}
          className="press min-h-16 rounded-2xl border-3 border-ink bg-go text-base font-extrabold text-white disabled:opacity-40"
        >
          {checking ? "…" : STR.pinEnter}
        </button>
      </div>
    </main>
  );
}
