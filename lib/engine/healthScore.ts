import type { Debt, SavingsGoal } from "@/lib/types";
import type { SpendingPace } from "@/lib/engine/spendingEngine";
import { getDebtSummary } from "@/lib/engine/debtEngine";

export interface HealthScoreResult {
  score: number; // 0-100
  band: "green" | "yellow" | "red";
  breakdown: {
    label: string;
    points: number;
    maxPoints: number;
  }[];
}

/**
 * V1 heuristic — intentionally simple and easy to explain in the UI.
 * Four factors, 25 points each:
 *   1. Spending pace this cycle (behind = 0, on-track = 18, ahead = 25)
 *   2. Debt trajectory (% of original debt already paid off)
 *   3. Savings progress (average progress % across active goals)
 *   4. Cycle buffer (% of the cycle elapsed vs % of balance still available)
 *
 * This is a starting point, not a finished model — tune weights once
 * there's a few months of real usage data to calibrate against.
 */
export function getHealthScore(
  pace: SpendingPace,
  debts: Debt[],
  savingsGoals: SavingsGoal[],
  cycleProgressPct: number,
  balanceRemainingPct: number
): HealthScoreResult {
  const paceScore = pace === "ahead" ? 25 : pace === "on-track" ? 18 : 6;

  const debtSummaries = debts.map(getDebtSummary);
  const activeDebts = debtSummaries.filter((d) => !d.isPaidOff);
  const debtScore =
    activeDebts.length === 0
      ? 25
      : Math.round(
          25 *
            (activeDebts.reduce((acc, d) => acc + d.paidAmount / d.totalAmount, 0) /
              activeDebts.length)
        );

  const savingsScore =
    savingsGoals.length === 0
      ? 12 // neutral if no goals set yet
      : Math.round(
          25 *
            Math.min(
              1,
              savingsGoals.reduce((acc, g) => acc + g.currentAmount / g.targetAmount, 0) /
                savingsGoals.length
            )
        );

  // Reward having more balance left than the cycle has elapsed (a buffer).
  const bufferRatio = balanceRemainingPct - cycleProgressPct;
  const bufferScore = Math.round(Math.min(25, Math.max(0, 12.5 + bufferRatio * 25)));

  const score = Math.max(0, Math.min(100, paceScore + debtScore + savingsScore + bufferScore));
  const band: HealthScoreResult["band"] = score >= 80 ? "green" : score >= 60 ? "yellow" : "red";

  return {
    score,
    band,
    breakdown: [
      { label: "Spending pace", points: paceScore, maxPoints: 25 },
      { label: "Debt trajectory", points: debtScore, maxPoints: 25 },
      { label: "Savings progress", points: savingsScore, maxPoints: 25 },
      { label: "Cycle buffer", points: bufferScore, maxPoints: 25 },
    ],
  };
}
