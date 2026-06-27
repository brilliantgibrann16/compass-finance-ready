"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { HealthScoreResult } from "@/lib/engine/healthScore";
import { ChevronDown, HeartPulse } from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

const BAND_CLASSES: Record<HealthScoreResult["band"], string> = {
  green: "text-emerald",
  yellow: "text-gold",
  red: "text-coral",
};

const BAND_COPY: Record<HealthScoreResult["band"], string> = {
  green: "Healthy",
  yellow: "Stay alert",
  red: "Needs attention",
};

export function HealthScoreCard({ result }: { result: HealthScoreResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <HeartPulse size={18} className={BAND_CLASSES[result.band]} />
          <span className="font-medium text-ink">Financial Health</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx("font-display text-xl font-semibold", BAND_CLASSES[result.band])}>
            <AnimatedNumber value={result.score} format={(v) => Math.round(v).toString()} />
          </span>
          <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown size={18} className="text-ink-faint" />
          </motion.span>
        </div>
      </button>
      <p className={clsx("mt-1 text-sm", BAND_CLASSES[result.band])}>{BAND_COPY[result.band]}</p>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 space-y-3 overflow-hidden border-t border-border-soft pt-4"
        >
          {result.breakdown.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">{item.label}</span>
              <span className="font-mono text-ink-faint">
                {item.points}/{item.maxPoints}
              </span>
            </div>
          ))}
        </motion.div>
      )}
    </Card>
  );
}
