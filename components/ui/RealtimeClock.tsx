"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

/**
 * RealtimeClock — A live digital clock that ticks every second.
 *
 * Implementation notes:
 *   • Uses setInterval(1000) inside useEffect for precise 1-second updates.
 *   • Properly calls clearInterval on unmount to prevent mobile memory leaks.
 *   • Formats time in HH:MM:SS with the user's local timezone.
 *   • Renders with the app's mono font for a premium digital readout feel.
 */

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function RealtimeClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial time on mount (avoids SSR hydration mismatch)
    setNow(new Date());

    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 1000);

    // Cleanup: prevent memory leak on mobile runtimes
    return () => clearInterval(intervalId);
  }, []);

  // During SSR / first render, show a placeholder to avoid hydration mismatch
  if (!now) {
    return (
      <div className="flex items-center gap-1.5 text-ink-faint">
        <Clock size={13} strokeWidth={1.8} />
        <span className="font-mono text-xs tabular-nums">--:--:--</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-border-soft bg-bg-raised/60 px-2.5 py-1">
        <Clock size={13} strokeWidth={1.8} className="text-gold/70" />
        <span className="font-mono text-xs tabular-nums text-ink">
          {formatTime(now)}
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-ink-faint">
        {formatDate(now)}
      </span>
    </div>
  );
}
