/**
 * Analytics Engine — Phase 4
 *
 * Computes spending trends, category breakdowns, and income vs expense
 * summaries from the transaction list.
 */

import { subDays, startOfMonth, endOfMonth, format } from "date-fns";
import type { Transaction, CategoryId } from "@/lib/types";
import { CATEGORIES } from "@/lib/engine/categoryDetector";
import { filterByDateRange, sumByKind } from "@/lib/engine/transactionUtils";

// ─── Types ───────────────────────────────────────────────────────

export interface SpendingTrend {
  label: string;
  date: string;
  expense: number;
  income: number;
}

export interface CategoryBreakdown {
  category: CategoryId;
  label: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface IncomeExpenseSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
  savingsRate: number;
}

export interface MonthlyReport {
  month: string;
  monthLabel: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  biggestCategory: { category: CategoryId; label: string; amount: number } | null;
  topMerchant: { name: string; amount: number; count: number } | null;
  categoryBreakdown: CategoryBreakdown[];
  dailyTrend: SpendingTrend[];
  transactionCount: number;
}



// ─── Spending Trends ─────────────────────────────────────────────

export function getDailyTrend(transactions: Transaction[], days: number, today: Date = new Date()): SpendingTrend[] {
  const result: SpendingTrend[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayTxs = transactions.filter((t) => t.date === dateStr);
    result.push({
      label: format(d, "MMM d"),
      date: dateStr,
      expense: sumByKind(dayTxs, "expense"),
      income: sumByKind(dayTxs, "income"),
    });
  }
  return result;
}

export function get7DaySpending(transactions: Transaction[], today: Date = new Date()): number {
  const start = subDays(today, 6);
  return sumByKind(filterByDateRange(transactions, start, today), "expense");
}

export function get30DaySpending(transactions: Transaction[], today: Date = new Date()): number {
  const start = subDays(today, 29);
  return sumByKind(filterByDateRange(transactions, start, today), "expense");
}

export function getMonthlySpending(transactions: Transaction[], today: Date = new Date()): number {
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  return sumByKind(filterByDateRange(transactions, start, end), "expense");
}

// ─── Category Breakdown ──────────────────────────────────────────

export function getCategoryBreakdown(transactions: Transaction[], kind: "expense" | "income" = "expense"): CategoryBreakdown[] {
  const filtered = transactions.filter((t) => t.kind === kind);
  const total = filtered.reduce((s, t) => s + t.amount, 0);

  const map = new Map<CategoryId, { amount: number; count: number }>();
  for (const t of filtered) {
    const entry = map.get(t.category) ?? { amount: 0, count: 0 };
    entry.amount += t.amount;
    entry.count += 1;
    map.set(t.category, entry);
  }

  const result: CategoryBreakdown[] = [];
  for (const [cat, { amount, count }] of map.entries()) {
    const meta = CATEGORIES[cat];
    result.push({
      category: cat,
      label: meta?.label ?? cat,
      color: meta?.color ?? "#8A93A6",
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      count,
    });
  }
  result.sort((a, b) => b.amount - a.amount);
  return result;
}

// ─── Income vs Expense Summary ───────────────────────────────────

export function getIncomeExpenseSummary(transactions: Transaction[]): IncomeExpenseSummary {
  const totalIncome = sumByKind(transactions, "income");
  const totalExpense = sumByKind(transactions, "expense");
  const net = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;
  return { totalIncome, totalExpense, net, savingsRate };
}

// ─── Monthly Report ──────────────────────────────────────────────

export function getMonthlyReport(transactions: Transaction[], year: number, month: number): MonthlyReport {
  const refDate = new Date(year, month - 1, 1);
  const start = startOfMonth(refDate);
  const end = endOfMonth(refDate);

  const monthTxs = filterByDateRange(transactions, start, end);
  const totalIncome = sumByKind(monthTxs, "income");
  const totalExpense = sumByKind(monthTxs, "expense");
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  const categoryBreakdown = getCategoryBreakdown(monthTxs, "expense");
  const biggestCategory = categoryBreakdown.length > 0
    ? { category: categoryBreakdown[0]!.category, label: categoryBreakdown[0]!.label, amount: categoryBreakdown[0]!.amount }
    : null;

  const merchantMap = new Map<string, { amount: number; count: number }>();
  for (const t of monthTxs.filter((t) => t.kind === "expense" && t.merchant)) {
    const name = t.merchant!;
    const entry = merchantMap.get(name) ?? { amount: 0, count: 0 };
    entry.amount += t.amount;
    entry.count += 1;
    merchantMap.set(name, entry);
  }
  let topMerchant: MonthlyReport["topMerchant"] = null;
  for (const [name, data] of merchantMap.entries()) {
    if (!topMerchant || data.amount > topMerchant.amount) {
      topMerchant = { name, ...data };
    }
  }

  const daysInMonth = end.getDate();
  const dailyTrend: SpendingTrend[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayTxs = monthTxs.filter((t) => t.date === dateStr);
    dailyTrend.push({
      label: format(date, "d"),
      date: dateStr,
      expense: sumByKind(dayTxs, "expense"),
      income: sumByKind(dayTxs, "income"),
    });
  }

  return {
    month: format(refDate, "yyyy-MM"),
    monthLabel: format(refDate, "MMMM yyyy"),
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    biggestCategory,
    topMerchant,
    categoryBreakdown,
    dailyTrend,
    transactionCount: monthTxs.length,
  };
}

export function getAvailableMonths(transactions: Transaction[]): { year: number; month: number; label: string }[] {
  const set = new Set<string>();
  for (const t of transactions) {
    set.add(t.date.slice(0, 7));
  }
  return Array.from(set)
    .sort()
    .reverse()
    .map((ym) => {
      const [y, m] = ym.split("-");
      return {
        year: parseInt(y ?? "2026", 10),
        month: parseInt(m ?? "1", 10),
        label: format(new Date(parseInt(y ?? "2026", 10), parseInt(m ?? "1", 10) - 1, 1), "MMMM yyyy"),
      };
    });
}
