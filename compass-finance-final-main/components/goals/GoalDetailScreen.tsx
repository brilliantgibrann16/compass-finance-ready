"use client";

import { useState } from "react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Card } from "@/components/ui/Card";
import { MilestoneTrack } from "@/components/goals/MilestoneTrack";
import { ContributeSheet } from "@/components/goals/ContributeSheet";
import { getGoalProjection, getRequiredMonthlyContribution, getMilestones } from "@/lib/engine/goalProjection";
import { formatRupiah } from "@/lib/utils/currency";
import { useAppStore } from "@/lib/store";
import type { SavingsGoal } from "@/lib/types";
import { PlusCircle } from "lucide-react";

interface GoalDetailScreenProps {
  goal: SavingsGoal;
  /** Graduation Fund wants milestone checkpoints; Emergency Fund doesn't. */
  showMilestones: boolean;
}

export function GoalDetailScreen({ goal, showMilestones }: GoalDetailScreenProps) {
  const [contributeOpen, setContributeOpen] = useState(false);
  const contributeToGoal = useAppStore((s) => s.contributeToGoal);

  const projection = getGoalProjection(goal);
  const requiredMonthly = getRequiredMonthlyContribution(goal);

  return (
    <>
      <div className="flex flex-col items-center py-2 text-center">
        <ProgressRing progress={projection.progressPct / 100}>
          <div className="text-center">
            <p className="font-mono text-3xl font-semibold text-ink">{projection.progressPct}%</p>
            <p className="text-xs text-ink-muted">funded</p>
          </div>
        </ProgressRing>

        <div className="mt-5 w-full">
          <AnimatedNumber
            value={goal.currentAmount}
            format={(v) => formatRupiah(v)}
            className="font-display text-2xl font-semibold text-ink"
          />
          <p className="text-sm text-ink-muted">of {formatRupiah(goal.targetAmount)} target</p>
        </div>
      </div>

      <Card className="mt-4 space-y-3">
        <Row label="Remaining" value={formatRupiah(projection.remainingAmount)} />
        <Row label="Current monthly contribution" value={formatRupiah(goal.monthlyContribution)} />
        <Row label="Projected completion" value={projection.projectedCompletionLabel} />
        {goal.targetDate && (
          <Row
            label="Target date"
            value={new Date(goal.targetDate).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })}
          />
        )}
        {requiredMonthly !== null && (
          <Row
            label="Needed per month to hit target"
            value={formatRupiah(requiredMonthly)}
            accent={requiredMonthly > goal.monthlyContribution ? "coral" : "emerald"}
          />
        )}
        {projection.isOnTrack !== null && (
          <p className={`text-xs ${projection.isOnTrack ? "text-emerald" : "text-coral"}`}>
            {projection.isOnTrack
              ? "On track to hit your target date at the current contribution rate."
              : "Current pace falls short of your target date — consider increasing monthly contributions."}
          </p>
        )}
      </Card>

      {showMilestones && (
        <div className="mt-4">
          <MilestoneTrack milestones={getMilestones(goal.targetAmount)} currentAmount={goal.currentAmount} />
        </div>
      )}

      <button
        onClick={() => setContributeOpen(true)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-medium text-bg transition hover:bg-gold/90"
      >
        <PlusCircle size={18} />
        Add funds
      </button>

      <ContributeSheet
        open={contributeOpen}
        onClose={() => setContributeOpen(false)}
        targetName={goal.name}
        onContribute={(amount) => contributeToGoal(goal.id, amount)}
      />
    </>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "coral";
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-muted">{label}</span>
      <span
        className={`font-medium ${accent === "emerald" ? "text-emerald" : accent === "coral" ? "text-coral" : "text-ink"}`}
      >
        {value}
      </span>
    </div>
  );
}
