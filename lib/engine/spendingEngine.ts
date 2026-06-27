import { isSameDay, isSameMonth, isSameWeek, parseISO } from "date-fns";
import { getCurrentCycle } from "@/lib/engine/transferCycle";
import type { Transaction, TransferSettings } from "@/lib/types";

export type SpendingPace = "ahead" | "on-track" | "behind";

export interface SpendingSnapshot {
  availableBalance: number;
  cycleLabel: string;
  daysUntilNextTransfer: number;
  /** How much is safe to spend today without jeopardizing the rest of the cycle. */
  safeToSpendToday: number;
  /** Same number, framed for the Transfer Cycle screen ("recommended daily limit"). */
  recommendedDailyLimit: number;
  remainingInCycle: number;
  todaySpent: number;
  weekSpent: number;
  monthSpent: number;
  pace: SpendingPace;
  /** Positive = spending less than the safe rate (good), negative = overspending. */
  paceDeltaPerDay: number;
}

function sumExpenses(transactions: Transaction[], predicate: (t: Transaction) => boolean): number {
  return transactions
    .filter((t) => t.kind === "expense" && predicate(t))
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getSpendingSnapshot(
  balance: number,
  transactions: Transaction[],
  transferSettings: TransferSettings,
  today: Date = new Date()
): SpendingSnapshot {
  const cycle = getCurrentCycle(today, transferSettings);

  const todaySpent = sumExpenses(transactions, (t) => isSameDay(parseISO(t.date), today));
  const weekSpent = sumExpenses(transactions, (t) =>
    isSameWeek(parseISO(t.date), today, { weekStartsOn: 1 })
  );
  const monthSpent = sumExpenses(transactions, (t) => isSameMonth(parseISO(t.date), today));

  const spentSoFarInCycle = sumExpenses(transactions, (t) => {
    const d = parseISO(t.date);
    return d >= cycle.cycleStart && d <= today;
  });

  // +1 so "today" is always included in the divisor, even on the last day of a cycle.
  const daysRemainingInclusive = Math.max(1, cycle.daysUntilNextTransfer);
  const safeToSpendToday = Math.max(0, Math.round(balance / daysRemainingInclusive));

  const daysElapsed = Math.max(1, cycle.daysElapsedInCycle);
  const averageDailySpend = spentSoFarInCycle / daysElapsed;
  const paceDeltaPerDay = Math.round(safeToSpendToday - averageDailySpend);

  let pace: SpendingPace = "on-track";
  if (paceDeltaPerDay > safeToSpendToday * 0.1) pace = "ahead";
  else if (paceDeltaPerDay < -safeToSpendToday * 0.1) pace = "behind";

  return {
    availableBalance: balance,
    cycleLabel: cycle.cycleLabel,
    daysUntilNextTransfer: cycle.daysUntilNextTransfer,
    safeToSpendToday,
    recommendedDailyLimit: safeToSpendToday,
    remainingInCycle: balance,
    todaySpent,
    weekSpent,
    monthSpent,
    pace,
    paceDeltaPerDay,
  };
}