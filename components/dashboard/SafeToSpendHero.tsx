"use client";

import { ProgressRing } from "@/components/ui/ProgressRing";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { formatNumberID } from "@/lib/utils/currency";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { SpendingSnapshot } from "@/lib/engine/spendingEngine";
import { clsx } from "clsx";

export function SafeToSpendHero({ snapshot }: { snapshot: SpendingSnapshot }) {
  const { t } = useTranslation();
  const ratio = snapshot.safeToSpendToday > 0 ? snapshot.todaySpent / snapshot.safeToSpendToday : 0;

  const paceConfig: Record<SpendingSnapshot["pace"], { label: string; color: string }> = {
    ahead: { label: t("paceUnder"), color: "text-emerald" },
    "on-track": { label: t("paceOnTrack"), color: "text-gold" },
    behind: { label: t("paceOver"), color: "text-coral" },
  };

  const pace = paceConfig[snapshot.pace];
  const ringColor = ratio > 1 ? "#F87171" : ratio > 0.85 ? "#F0B429" : "#34D399";

  return (
    <div className="flex flex-col items-center aero-glass-glow p-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
        {t("safeToSpend")}
      </p>

      <div className="my-4">
        <ProgressRing progress={ratio} progressColor={ringColor}>
          <div className="flex flex-col items-center">
            <span className="font-display text-3xl font-semibold text-ink">
              <AnimatedNumber value={snapshot.safeToSpendToday} format={(v) => `Rp${formatNumberID(v)}`} />
            </span>
            <span className="mt-1 text-xs text-ink-muted">
              spent: Rp{formatNumberID(snapshot.todaySpent)}
            </span>
          </div>
        </ProgressRing>
      </div>

      <p className={clsx("font-medium", pace.color)}>{pace.label}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {snapshot.daysUntilNextTransfer} day{snapshot.daysUntilNextTransfer === 1 ? "" : "s"} left in
        cycle &middot; {snapshot.cycleLabel}
      </p>
    </div>
  );
}
