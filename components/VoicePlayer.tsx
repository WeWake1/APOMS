"use client";

import { useEffect, useRef, useState } from "react";
import { STR } from "@/lib/strings";

function fmt(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Big obvious play/pause + a simple progress bar. Plain taps only.
export default function VoicePlayer({
  src,
  duration,
}: {
  src: string;
  duration: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;
    const total = () =>
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : duration || 0;
    const onTime = () => {
      setElapsed(audio.currentTime);
      const t = total();
      if (t > 0) setProgress(Math.min(1, audio.currentTime / t));
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setElapsed(0);
      audio.currentTime = 0;
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, [src, duration]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border-3 border-ink bg-stamp-soft px-4 py-2"
      aria-label={`${STR.voiceNote} — ${playing ? STR.pause : STR.play}`}
    >
      <span className="text-2xl" aria-hidden>
        {playing ? "⏸" : "▶"}
      </span>
      <span className="text-lg font-extrabold">
        {playing ? STR.pause : STR.play}
      </span>
      <span className="relative h-3 flex-1 overflow-hidden rounded-full border-2 border-ink bg-card">
        <span
          className="absolute inset-y-0 left-0 bg-stamp"
          style={{ width: `${progress * 100}%` }}
        />
      </span>
      <span className="text-base font-bold tabular-nums">
        {playing ? fmt(elapsed) : fmt(duration ?? 0)}
      </span>
    </button>
  );
}
