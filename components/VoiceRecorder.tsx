"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { STR } from "@/lib/strings";
import VoicePlayer from "@/components/VoicePlayer";

export type VoiceNote = { blob: Blob; duration: number };

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
}

// Tap to record, tap to stop. Then playback preview + delete & re-record.
export default function VoiceRecorder({
  voice,
  onChange,
}: {
  voice: VoiceNote | null;
  onChange: (v: VoiceNote | null) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const preview = useMemo(
    () => (voice ? URL.createObjectURL(voice.blob) : null),
    [voice]
  );
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function startRecording() {
    setError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
        if (blob.size > 0 && duration > 0) onChange({ blob, duration });
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(
        () => setSeconds(Math.round((Date.now() - startedAtRef.current) / 1000)),
        500
      );
    } catch {
      setError(true);
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    setRecording(false);
  }

  if (voice && preview) {
    return (
      <div className="flex flex-col gap-3">
        <VoicePlayer src={preview} duration={voice.duration} />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="press min-h-14 rounded-xl border-3 border-ink bg-card text-lg font-extrabold text-stamp"
        >
          {STR.deleteRerecord}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        className={`press min-h-16 rounded-2xl border-3 border-ink text-xl font-extrabold ${
          recording ? "bg-stamp text-white" : "bg-card"
        }`}
      >
        {recording ? `${STR.stopRecording} · ${seconds}s` : STR.recordVoice}
      </button>
      {error && (
        <p className="rounded-lg bg-stamp-soft px-3 py-2 text-base font-bold text-stamp">
          {STR.micError}
        </p>
      )}
    </div>
  );
}
