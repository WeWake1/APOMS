"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createOrder } from "@/app/actions";
import { compressPhoto } from "@/lib/compress";
import { STR } from "@/lib/strings";
import VoiceRecorder, { type VoiceNote } from "@/components/VoiceRecorder";

export default function AddOrderForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [customer, setCustomer] = useState("");
  const [voice, setVoice] = useState<VoiceNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [pasteError, setPasteError] = useState(false);
  const [pasteMenu, setPasteMenu] = useState<{ x: number; y: number } | null>(null);

  // The photo IS the order — open the picker immediately on entering.
  useEffect(() => {
    fileInputRef.current?.click();
  }, []);

  const applyPhoto = useCallback(async (source: Blob) => {
    const compressed = await compressPhoto(source);
    setPhoto(compressed);
    setPasteError(false);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(compressed);
    });
  }, []);

  async function onPhotoChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await applyPhoto(file);
  }

  // Ctrl+V / Cmd+V anywhere on the page pastes a copied photo.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/")
      );
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();
      void applyPhoto(file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [applyPhoto]);

  async function pasteFromClipboard() {
    setPasteMenu(null);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) {
          await applyPhoto(await item.getType(type));
          return;
        }
      }
      setPasteError(true);
    } catch {
      setPasteError(true);
    }
  }

  function onPhotoContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setPasteMenu({ x: e.clientX, y: e.clientY });
  }

  async function save() {
    if (!photo || saving) return;
    setSaving(true);
    setError(false);

    const formData = new FormData();
    formData.set("photo", new File([photo], "photo.jpg", { type: "image/jpeg" }));
    formData.set("customer", customer);
    if (voice) {
      const ext = voice.blob.type.includes("mp4") ? "mp4" : "webm";
      formData.set("voice", new File([voice.blob], `voice.${ext}`, { type: voice.blob.type }));
      formData.set("voiceDuration", String(voice.duration));
    }

    const res = await createOrder(formData);
    if (res.ok) {
      setSaved(true);
      router.replace("/");
      router.refresh();
    } else {
      setError(true);
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col gap-6 px-4 pb-32 pt-5">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="press flex min-h-14 items-center rounded-xl border-3 border-ink bg-card px-4 text-lg font-extrabold"
        >
          {STR.cancel}
        </Link>
        <h1 className="stencil text-3xl">{STR.addTitle}</h1>
      </header>

      {/* 1. Photo — REQUIRED */}
      <section className="flex flex-col gap-2" onContextMenu={onPhotoContextMenu}>
        <p className="text-xl font-extrabold">{STR.photoRequired}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onPhotoChosen}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhotoChosen}
          className="hidden"
        />
        {photoPreview ? (
          <div className="flex flex-col gap-3">
            <div className="tag-card overflow-hidden p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Order photo preview"
                className="max-h-96 w-full rounded-lg object-contain"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="press min-h-14 rounded-xl border-3 border-ink bg-card text-lg font-extrabold"
              >
                {STR.changePhoto}
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="press min-h-14 rounded-xl border-3 border-ink bg-card text-lg font-extrabold"
              >
                {STR.takePhoto}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="press min-h-32 rounded-2xl border-3 border-dashed border-ink bg-card text-2xl font-extrabold"
            >
              {STR.addPhoto}
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="press min-h-16 rounded-2xl border-3 border-ink bg-card text-xl font-extrabold"
            >
              {STR.takePhoto}
            </button>
            <p className="hidden text-base font-bold pointer-fine:block">{STR.pasteHint}</p>
          </div>
        )}
        {pasteError && (
          <p className="rounded-xl bg-stamp-soft px-4 py-3 text-lg font-bold text-stamp">
            {STR.pasteNoImage}
          </p>
        )}
      </section>

      {/* 2. Customer name — optional */}
      <section className="flex flex-col gap-2">
        <label htmlFor="customer" className="text-xl font-extrabold">
          {STR.customerName}
        </label>
        <input
          id="customer"
          type="text"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder={STR.customerPlaceholder}
          maxLength={60}
          className="min-h-16 rounded-2xl border-3 border-ink bg-card px-4 text-xl font-bold placeholder:text-muted/60"
        />
      </section>

      {/* 3. Voice note — optional */}
      <section className="flex flex-col gap-2">
        <p className="text-xl font-extrabold">{STR.voiceNote}</p>
        <VoiceRecorder voice={voice} onChange={setVoice} />
      </section>

      {error && (
        <p className="rounded-xl bg-stamp-soft px-4 py-3 text-lg font-bold text-stamp">
          {STR.uploadError}
        </p>
      )}

      {/* Giant save button */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-120 px-4 pb-4">
        <button
          type="button"
          onClick={save}
          disabled={!photo || saving}
          className="press flex min-h-16 w-full items-center justify-center rounded-2xl border-3 border-ink bg-go text-2xl font-extrabold text-white disabled:border-muted disabled:bg-muted disabled:opacity-60"
        >
          {saved ? STR.saved : saving ? STR.saving : STR.saveOrder}
        </button>
      </div>

      {/* Right-click menu on the photo section: paste a copied photo */}
      {pasteMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setPasteMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setPasteMenu(null);
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void pasteFromClipboard();
            }}
            className="press fixed min-h-14 rounded-xl border-3 border-ink bg-card px-5 text-lg font-extrabold shadow-lg"
            style={{
              left: Math.min(pasteMenu.x, window.innerWidth - 220),
              top: Math.min(pasteMenu.y, window.innerHeight - 72),
            }}
          >
            {STR.pastePhoto}
          </button>
        </div>
      )}

      {/* Obvious uploading overlay */}
      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60">
          <div className="tag-card flex flex-col items-center gap-4 px-10 py-8">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-ink border-t-transparent" />
            <p className="text-2xl font-extrabold">{saved ? STR.saved : STR.saving}</p>
          </div>
        </div>
      )}
    </main>
  );
}
