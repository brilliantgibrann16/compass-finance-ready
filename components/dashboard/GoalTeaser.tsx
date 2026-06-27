"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatRupiahCompact } from "@/lib/utils/currency";
import { getGoalProjection } from "@/lib/engine/goalProjection";
import type { SavingsGoal } from "@/lib/types";
import { GraduationCap, ShieldCheck } from "lucide-react";

const ICONS = { graduation: GraduationCap, emergency: ShieldCheck, custom: ShieldCheck } as const;
const ROUTE_BY_TYPE = {
  graduation: "/goals/graduation",
  emergency: "/goals/emergency",
  custom: "/goals/emergency",
} as const;

export function GoalTeaser({ goal }: { goal: SavingsGoal }) {
  const projection = getGoalProjection(goal);
  const Icon = ICONS[goal.type];

  return (
    <Link href={ROUTE_BY_TYPE[goal.type]}>
      <Card className="cursor-pointer transition hover:border-gold/30">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={18} className="text-gold" />
            <span className="font-medium text-ink">{goal.name}</span>
          </div>
          <span className="font-mono text-sm text-ink-muted">{projection.progressPct}%</span>
        </div>
        <ProgressBar progress={projection.progressPct} />
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-ink-muted">
            {formatRupiahCompact(goal.currentAmount)} / {formatRupiahCompact(goal.targetAmount)}
          </span>
          <span className="text-ink-faint">Proj. {projection.projectedCompletionLabel}</span>
        </div>
      </Card>
    </Link>
  );
}
