"use client";

// Simple full-screen confirm with two big buttons. No portals, no
// animation — as plain and obvious as possible.
export default function ConfirmDialog({
  title,
  yesLabel,
  noLabel,
  onYes,
  onNo,
  busy,
}: {
  title: string;
  yesLabel: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
  busy?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-6"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="tag-card flex w-full max-w-sm flex-col gap-5 p-6">
        <p className="text-center text-2xl font-extrabold">{title}</p>
        <button
          type="button"
          onClick={onYes}
          disabled={busy}
          className="press min-h-16 rounded-2xl border-3 border-ink bg-go text-xl font-extrabold text-white disabled:opacity-50"
        >
          {busy ? "…" : yesLabel}
        </button>
        <button
          type="button"
          onClick={onNo}
          disabled={busy}
          className="press min-h-16 rounded-2xl border-3 border-ink bg-card text-xl font-extrabold"
        >
          {noLabel}
        </button>
      </div>
    </div>
  );
}
