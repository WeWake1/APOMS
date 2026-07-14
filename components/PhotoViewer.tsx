"use client";

import { useEffect, useRef, useState } from "react";
import { STR } from "@/lib/strings";

// Full-screen photo viewer with pinch-zoom, drag-to-pan, double-tap zoom
// and a big ✕ button. Implemented with pointer events because the app
// viewport locks page zoom.
export default function PhotoViewer({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  const [t, setT] = useState({ scale: 1, x: 0, y: 0 });
  const [interacting, setInteracting] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef({ scale: 1, x: 0, y: 0, dist: 0, cx: 0, cy: 0 });
  const lastTap = useRef(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function pinchInfo() {
    const pts = [...pointers.current.values()];
    const [a, b] = pts;
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setInteracting(true);

    if (pointers.current.size === 2) {
      const { dist, cx, cy } = pinchInfo();
      start.current = { ...t, dist, cx, cy };
    } else if (pointers.current.size === 1) {
      start.current = { ...t, dist: 0, cx: e.clientX, cy: e.clientY };

      // Double-tap: toggle zoom
      const now = Date.now();
      if (now - lastTap.current < 300) {
        setT((cur) =>
          cur.scale > 1
            ? { scale: 1, x: 0, y: 0 }
            : {
                scale: 2.5,
                x: (window.innerWidth / 2 - e.clientX) * 1.5,
                y: (window.innerHeight / 2 - e.clientY) * 1.5,
              }
        );
      }
      lastTap.current = now;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const { dist, cx, cy } = pinchInfo();
      const s = start.current;
      const scale = Math.min(5, Math.max(1, (s.scale * dist) / (s.dist || 1)));
      setT({
        scale,
        x: s.x + (cx - s.cx),
        y: s.y + (cy - s.cy),
      });
    } else if (pointers.current.size === 1 && t.scale > 1) {
      const s = start.current;
      setT({
        scale: s.scale,
        x: s.x + (e.clientX - s.cx),
        y: s.y + (e.clientY - s.cy),
      });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      setInteracting(false);
      if (t.scale <= 1.05) setT({ scale: 1, x: 0, y: 0 });
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink" role="dialog" aria-modal="true">
      <div
        className="h-full w-full overflow-hidden"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Order photo"
          draggable={false}
          className="h-full w-full select-none object-contain"
          style={{
            transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
            transition: interacting ? "none" : "transform 120ms ease",
          }}
        />
      </div>
      <button
        type="button"
        onClick={onClose}
        className="press absolute right-4 top-4 z-10 min-h-14 rounded-2xl border-3 border-card bg-ink px-5 text-xl font-extrabold text-card"
      >
        {STR.close}
      </button>
    </div>
  );
}
