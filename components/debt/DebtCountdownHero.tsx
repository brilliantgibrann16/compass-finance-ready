"use client";

import { ProgressRing } from "@/components/ui/ProgressRing";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { formatRupiahCompact } from "@/lib/utils/currency";
import type { AllDebtsSummary, DebtFreeCountdown } from "@/lib/engine/debtEngine";
import { PartyPopper } from "lucide-react";

interface DebtCountdownHeroProps {
  summary: AllDebtsSummary;
  countdown: DebtFreeCountdown;
}

export function DebtCountdownHero({ summary, countdown }: DebtCountdownHeroProps) {
  if (summary.isAllPaidOff) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <ProgressRing progress={1} progressColor="#34D399">
          <PartyPopper size={40} className="text-emerald" />
        </ProgressRing>
        <p className="mt-4 font-display text-lg font-semibold text-ink">You&apos;re debt-free!</p>
        <p className="text-sm text-ink-muted">Every installment is paid off.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-2 text-center">
      <ProgressRing progress={summary.progressPct / 100}>
        <div className="text-center">
          <p className="font-mono text-3xl font-semibold text-ink">{summary.progressPct}%</p>
          <p className="text-xs text-ink-muted">paid off</p>
        </div>
      </ProgressRing>

      <div className="mt-5 w-full space-y-1">
        <p className="text-sm text-ink-muted">Remaining balance</p>
        <AnimatedNumber
          value={summary.remainingAmount}
          format={(v) => `Rp${formatRupiahCompact(v).replace("Rp", "")}`}
          className="font-display text-2xl font-semibold text-coral"
        />
      </div>

      <div className="mt-4 flex w-full items-center justify-between rounded-xl border border-border-soft bg-bg px-4 py-3 text-sm">
        <span className="text-ink-muted">Target</span>
        <span className="font-medium text-ink">{countdown.targetLabel}</span>
      </div>

      {countdown.isOnTrack !== null && (
        <p
          className={`mt-2 text-xs ${countdown.isOnTrack ? "text-emerald" : "text-coral"}`}
        >
          {countdown.isOnTrack
            ? `On track — installments wrap up by ${countdown.actualProjectedLabel}`
            : `Behind target — current schedule runs to ${countdown.actualProjectedLabel}`}
        </p>
      )}
    </div>
  );
}
