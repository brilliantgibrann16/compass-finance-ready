/**
 * Shared transaction filtering and aggregation helpers.
 *
 * These utilities were previously duplicated across insightsEngine,
 * analyticsEngine, advisorEngine, and spendingEngine.
 */

import { parseISO, isWithinInterval } from "date-fns";
import type { Transaction } from "@/lib/types";

/** Filter transactions whose date falls within [start, end]. */
export function filterByDateRange(
  transactions: Transaction[],
  start: Date,
  end: Date
): Transaction[] {
  return transactions.filter((t) => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start, end });
  });
}

/** Filter transactions by kind ("expense" | "income"). */
export function filterByKind(
  transactions: Transaction[],
  kind: "expense" | "income"
): Transaction[] {
  return transactions.filter((t) => t.kind === kind);
}

/** Sum the `amount` field of all transactions in the array. */
export function sumAmount(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/** Filter by kind then sum — the most common aggregation pattern. */
export function sumByKind(
  transactions: Transaction[],
  kind: "expense" | "income"
): number {
  return sumAmount(filterByKind(transactions, kind));
}

/** Determine direction label from a numeric change value. */
export function getDirection(change: number): "up" | "down" | "same" {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "same";
}

/** Calculate percentage change between two values. */
export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
