"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#F0B429", "#34D399", "#F87171", "#F5F3EE"];

/** Lightweight particle burst built from divs + Framer Motion — no
 *  confetti library needed for a one-off celebration moment. */
export function Confetti({ count = 40 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.4 + Math.random() * 1.2,
        rotate: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
        drift: (Math.random() - 0.5) * 120,
      })),
    [count]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-[-5%] rounded-sm"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.4, backgroundColor: p.color }}
          initial={{ y: 0, x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", x: p.drift, opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
