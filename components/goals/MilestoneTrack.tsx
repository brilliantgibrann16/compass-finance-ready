"use client";

import { formatRupiahCompact } from "@/lib/utils/currency";
import { clsx } from "clsx";
import { Check } from "lucide-react";

interface MilestoneTrackProps {
  milestones: number[];
  currentAmount: number;
}

export function MilestoneTrack({ milestones, currentAmount }: MilestoneTrackProps) {
  return (
    <div className="rounded-xl2 border border-border-soft bg-bg-raised p-5">
      <h3 className="mb-4 font-display font-medium text-ink">Milestones</h3>
      <div className="flex items-start justify-between">
        {milestones.map((milestone, idx) => {
          const reached = currentAmount >= milestone;
          return (
            <div key={milestone} className="flex flex-1 flex-col items-center text-center">
              <span
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition",
                  reached ? "border-emerald bg-emerald text-bg" : "border-border-soft text-ink-faint"
                )}
              >
                {reached ? <Check size={16} strokeWidth={3} /> : idx + 1}
              </span>
              <span className={clsx("mt-2 text-[11px]", reached ? "text-ink" : "text-ink-faint")}>
                {formatRupiahCompact(milestone)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
