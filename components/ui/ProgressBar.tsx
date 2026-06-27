"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";

interface ProgressBarProps {
  /** 0-100 */
  progress: number;
  color?: string;
  trackClassName?: string;
  className?: string;
}

export function ProgressBar({
  progress,
  color = "#F0B429",
  trackClassName,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <div className={clsx("h-[3px] w-full overflow-hidden rounded-full bg-bg-hover", trackClassName, className)}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}66` }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
}
