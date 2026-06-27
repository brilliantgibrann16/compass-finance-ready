"use client";



import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { animate } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}

/**
 * Animates a number counting up/down to `value` whenever it changes.
 * Respects prefers-reduced-motion by snapping instantly.
 */
export function AnimatedNumber({
  value,
  format = (v) => Math.round(v).toLocaleString("id-ID"),
  duration = 0.6,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setDisplay(value);
      previousValue.current = value;
      return;
    }

    const controls = animate(previousValue.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(latest),
    });

    previousValue.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return (
    <span className={clsx("font-mono tabular-nums tracking-tight", className)}>
      {format(display)}
    </span>
  );
}
