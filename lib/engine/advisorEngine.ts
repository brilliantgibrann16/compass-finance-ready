/**
 * AI Financial Advisor Engine — Phase 5
 *
 * Generates personalized recommendations, spending-change analysis,
 * savings/goal/debt forecasts, overspending alerts, and merchant analysis.
 *
 * Pure + deterministic: the reference date ("today") is always injected so
 * every calculation is reproducible under a frozen clock in tests.
 * Monetary figures flow through untouched (no rounding of domain balances),
 * so domain fixtures such as GoPay Pinjam (1.937.350 IDR) are preserved
 * exactly end-to-end.
 */

import {
  parseISO, subMonths, startOfMonth, endOfMonth, differenceInMonths,
  differenceInDays, addMonths, format,
} from "date-fns";
import type {
  Transaction, CategoryId, SavingsGoal, Debt,
} from "@/lib/types";
import { CATEGORIES } from "@/lib/engine/categoryDetector";
import {
  filterByDateRange, sumByKind, getDirection, pctChange,
} from "@/lib/engine/transactionUtils";

// ─── Types ───────────────────────────────────────────────────────

export type AdvisorSeverity = "info" | "warning" | "critical" | "success";

export interface AdvisorRecommendation {
  id: string;
  title: string;
  message: string;
  severity: AdvisorSeverity;
  category?: CategoryId;
  actionLabel?: string;
  actionHref?: string;
}

export interface SpendingChange {
  category: CategoryId;
  label: string;
  color: string;
  thisMonth: number;
  lastMonth: number;
  change: number;
  changePercent: number;
  direction: "up" | "down" | "same";
}

export interface MerchantChange {
  name: string;
  thisMonth: number;
  lastMonth: number;
  change: number;
  changePercent: number;
  direction: "up" | "down" | "same";
}

export interface MonthComparison {
  thisMonthTotal: number;
  lastMonthTotal: number;
  change: number;
  changePercent: number;
  direction: "up" | "down" | "same";
  categoryChanges: SpendingChange[];
  merchantChanges: MerchantChange[];
}

export interface SavingsForecast {
  months: number;
  projectedSavings: number;
  projectedBalance: number;
}

export interface GoalForecast {
  goalId: string;
  goalName: string;
  remaining: number;
  monthlyContribution: number;
  estimatedMonths: number;
  estimatedDate: string;
  onTrack: boolean;
  progressPercent: number;
}

export interface DebtForecast {
  debtId: string;
  debtName: string;
  totalRemaining: number;
  estimatedPayoffDate: string;
  monthsRemaining: number;
  nextPayment: { amount: number; dueDate: string } | null;
}

export interface OverspendingAlert {
  category: CategoryId;
  label: string;
  color: string;
  currentSpend: number;
  averageSpend: number;
  threshold: number;
  overagePercent: number;
}

export interface MerchantAnalysis {
  name: string;
  totalSpent: number;
  transactionCount: number;
  avgPerVisit: number;
  lastVisit: string;
  category: CategoryId;
}

// ─── Helpers ─────────────────────────────────────────────────────

function filterByMonth(txs: Transaction[], year: number, month: number): Transaction[] {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(new Date(year, month - 1, 1));
  return filterByDateRange(txs, start, end);
}

function sumExpenses(txs: Transaction[]): number {
  return sumByKind(txs, "expense");
}

function sumIncome(txs: Transaction[]): number {
  return sumByKind(txs, "income");
}

// ─── 1. Spending Change Analysis ─────────────────────────────────

export function getMonthComparison(transactions: Transaction[], today: Date = new Date()): MonthComparison {
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth() + 1;
  const lastDate = subMonths(today, 1);
  const lastYear = lastDate.getFullYear();
  const lastMonth = lastDate.getMonth() + 1;

  const thisTxs = filterByMonth(transactions, thisYear, thisMonth).filter((t) => t.kind === "expense");
  const lastTxs = filterByMonth(transactions, lastYear, lastMonth).filter((t) => t.kind === "expense");

  const thisTotal = thisTxs.reduce((s, t) => s + t.amount, 0);
  const lastTotal = lastTxs.reduce((s, t) => s + t.amount, 0);

  const allCats = new Set<CategoryId>();
  thisTxs.forEach((t) => allCats.add(t.category));
  lastTxs.forEach((t) => allCats.add(t.category));

  const categoryChanges: SpendingChange[] = [];
  for (const cat of allCats) {
    const thisAmt = thisTxs.filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0);
    const lastAmt = lastTxs.filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0);
    const change = thisAmt - lastAmt;
    const meta = CATEGORIES[cat];
    categoryChanges.push({
      category: cat,
      label: meta?.label ?? cat,
      color: meta?.color ?? "#8A93A6",
      thisMonth: thisAmt,
      lastMonth: lastAmt,
      change,
      changePercent: pctChange(thisAmt, lastAmt),
      direction: getDirection(change),
    });
  }
  categoryChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  const allMerchants = new Set<string>();
  thisTxs.forEach((t) => { if (t.merchant) allMerchants.add(t.merchant); });
  lastTxs.forEach((t) => { if (t.merchant) allMerchants.add(t.merchant); });

  const merchantChanges: MerchantChange[] = [];
  for (const name of allMerchants) {
    const thisAmt = thisTxs.filter((t) => t.merchant === name).reduce((s, t) => s + t.amount, 0);
    const lastAmt = lastTxs.filter((t) => t.merchant === name).reduce((s, t) => s + t.amount, 0);
    const change = thisAmt - lastAmt;
    merchantChanges.push({
      name, thisMonth: thisAmt, lastMonth: lastAmt, change,
      changePercent: pctChange(thisAmt, lastAmt),
      direction: getDirection(change),
    });
  }
  merchantChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  return {
    thisMonthTotal: thisTotal, lastMonthTotal: lastTotal,
    change: thisTotal - lastTotal, changePercent: pctChange(thisTotal, lastTotal),
    direction: getDirection(thisTotal - lastTotal),
    categoryChanges, merchantChanges,
  };
}

// ─── 2. Savings Forecast ─────────────────────────────────────────

export function getSavingsForecasts(
  transactions: Transaction[], balance: number, today: Date = new Date(),
): SavingsForecast[] {
  let totalNet = 0;
  let monthsCounted = 0;
  for (let i = 1; i <= 3; i++) {
    const d = subMonths(today, i);
    const monthTxs = filterByMonth(transactions, d.getFullYear(), d.getMonth() + 1);
    if (monthTxs.length > 0) {
      totalNet += sumIncome(monthTxs) - sumExpenses(monthTxs);
      monthsCounted++;
    }
  }
  const avgMonthlyNet = monthsCounted > 0 ? totalNet / monthsCounted : 0;

  return [3, 6, 12].map((months) => ({
    months,
    projectedSavings: Math.round(avgMonthlyNet * months),
    projectedBalance: Math.round(balance + avgMonthlyNet * months),
  }));
}

// ─── 3. Goal Forecast ────────────────────────────────────────────

export function getGoalForecasts(goals: SavingsGoal[], today: Date = new Date()): GoalForecast[] {
  return goals.map((goal) => {
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    const monthly = goal.monthlyContribution;
    const estimatedMonths = monthly > 0 ? Math.ceil(remaining / monthly) : Infinity;
    const estimatedDate = monthly > 0
      ? format(addMonths(today, estimatedMonths), "yyyy-MM-dd")
      : "Unknown";
    const progressPercent = goal.targetAmount > 0
      ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;

    let onTrack = true;
    if (goal.targetDate && monthly > 0) {
      const targetDate = parseISO(goal.targetDate);
      const monthsUntilTarget = differenceInMonths(targetDate, today);
      onTrack = estimatedMonths <= monthsUntilTarget + 1;
    }

    return {
      goalId: goal.id, goalName: goal.name, remaining,
      monthlyContribution: monthly,
      estimatedMonths: estimatedMonths === Infinity ? -1 : estimatedMonths,
      estimatedDate, onTrack, progressPercent,
    };
  });
}

// ─── 4. Debt Forecast ────────────────────────────────────────────

export function getDebtForecasts(debts: Debt[], today: Date = new Date()): DebtForecast[] {
  return debts.map((debt) => {
    const unpaid = debt.installments.filter((i) => !i.isPaid);
    const totalRemaining = unpaid.reduce((s, i) => s + i.amount, 0);

    const futureInstallments = unpaid
      .filter((i) => parseISO(i.dueDate) >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const nextPayment = futureInstallments.length > 0
      ? { amount: futureInstallments[0]!.amount, dueDate: futureInstallments[0]!.dueDate }
      : null;

    const lastInstallment = unpaid.length > 0
      ? unpaid.reduce((latest, i) => i.dueDate > latest.dueDate ? i : latest)
      : null;

    const estimatedPayoffDate = lastInstallment?.dueDate ?? "Paid off";
    const monthsRemaining = lastInstallment
      ? Math.max(0, differenceInMonths(parseISO(lastInstallment.dueDate), today))
      : 0;

    return {
      debtId: debt.id, debtName: debt.name, totalRemaining,
      estimatedPayoffDate, monthsRemaining, nextPayment,
    };
  });
}

// ─── Overspending buffer (safe-to-spend) ─────────────────────────
//
// A category is flagged the instant its current-month spend breaches the
// trailing 3-month average by more than the safe-to-spend buffer (130% of
// that average). A small noise floor avoids alerting on trivial categories.
const SAFE_TO_SPEND_BUFFER_MULTIPLIER = 1.3;
const MIN_TRACKABLE_AVG_SPEND = 5_000;

// ─── 5. Overspending Alerts ──────────────────────────────────────

export function getOverspendingAlerts(
  transactions: Transaction[], today: Date = new Date(), thresholdMultiplier: number = SAFE_TO_SPEND_BUFFER_MULTIPLIER,
): OverspendingAlert[] {
  const categoryAvg = new Map<CategoryId, { total: number; months: number }>();

  for (let i = 1; i <= 3; i++) {
    const d = subMonths(today, i);
    const monthTxs = filterByMonth(transactions, d.getFullYear(), d.getMonth() + 1)
      .filter((t) => t.kind === "expense");

    const seen = new Set<CategoryId>();
    for (const t of monthTxs) {
      if (!seen.has(t.category)) {
        const entry = categoryAvg.get(t.category) ?? { total: 0, months: 0 };
        entry.months += 1;
        categoryAvg.set(t.category, entry);
        seen.add(t.category);
      }
      const entry = categoryAvg.get(t.category)!;
      entry.total += t.amount;
    }
  }

  const thisMonthTxs = filterByMonth(transactions, today.getFullYear(), today.getMonth() + 1)
    .filter((t) => t.kind === "expense");

  const alerts: OverspendingAlert[] = [];

  for (const [cat, { total, months }] of categoryAvg.entries()) {
    if (months === 0) continue;
    const avg = total / months;
    const threshold = avg * thresholdMultiplier;
    const current = thisMonthTxs.filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0);

    if (current > threshold && avg >= MIN_TRACKABLE_AVG_SPEND) {
      const meta = CATEGORIES[cat];
      alerts.push({
        category: cat,
        label: meta?.label ?? cat,
        color: meta?.color ?? "#8A93A6",
        currentSpend: current,
        averageSpend: Math.round(avg),
        threshold: Math.round(threshold),
        overagePercent: Math.round(((current - threshold) / threshold) * 100),
      });
    }
  }

  alerts.sort((a, b) => b.overagePercent - a.overagePercent);
  return alerts;
}

// ─── 6. Merchant Analysis ────────────────────────────────────────

export function getMerchantAnalysis(transactions: Transaction[]): MerchantAnalysis[] {
  const map = new Map<string, {
    totalSpent: number; count: number; lastVisit: string; category: CategoryId;
  }>();

  for (const t of transactions) {
    if (t.kind !== "expense" || !t.merchant) continue;
    const existing = map.get(t.merchant);
    if (existing) {
      existing.totalSpent += t.amount;
      existing.count += 1;
      if (t.date > existing.lastVisit) {
        existing.lastVisit = t.date;
        existing.category = t.category;
      }
    } else {
      map.set(t.merchant, {
        totalSpent: t.amount, count: 1, lastVisit: t.date, category: t.category,
      });
    }
  }

  const result: MerchantAnalysis[] = [];
  for (const [name, data] of map.entries()) {
    result.push({
      name, totalSpent: data.totalSpent, transactionCount: data.count,
      avgPerVisit: Math.round(data.totalSpent / data.count),
      lastVisit: data.lastVisit, category: data.category,
    });
  }
  result.sort((a, b) => b.totalSpent - a.totalSpent);
  return result;
}

// ─── 7. AI Recommendations ───────────────────────────────────────

export function getRecommendations(
  transactions: Transaction[], balance: number, goals: SavingsGoal[],
  debts: Debt[], today: Date = new Date(),
): AdvisorRecommendation[] {
  const recs: AdvisorRecommendation[] = [];
  let recId = 0;
  const nextId = () => `rec-${++recId}`;

  const comparison = getMonthComparison(transactions, today);
  const goalForecasts = getGoalForecasts(goals, today);
  const debtForecasts = getDebtForecasts(debts, today);
  const alerts = getOverspendingAlerts(transactions, today);
  const forecasts = getSavingsForecasts(transactions, balance, today);

  // 1. Overall spending trend
  if (comparison.direction === "up" && comparison.changePercent > 15) {
    recs.push({
      id: nextId(), title: "Spending increased",
      message: `Your spending is up ${comparison.changePercent}% compared to last month. Consider reviewing your expenses.`,
      severity: comparison.changePercent > 30 ? "critical" : "warning",
      actionLabel: "View Analytics", actionHref: "/analytics",
    });
  } else if (comparison.direction === "down" && comparison.changePercent < -10) {
    recs.push({
      id: nextId(), title: "Great progress!",
      message: `You've reduced spending by ${Math.abs(comparison.changePercent)}% compared to last month. Keep it up!`,
      severity: "success",
    });
  }

  // 2. Top category increases
  for (const cat of comparison.categoryChanges.slice(0, 3)) {
    if (cat.direction === "up" && cat.changePercent > 25 && cat.thisMonth > 10000) {
      recs.push({
        id: nextId(), title: `${cat.label} spending up ${cat.changePercent}%`,
        message: `You spent Rp${Math.round(cat.thisMonth / 1000)}k on ${cat.label} this month, up from Rp${Math.round(cat.lastMonth / 1000)}k last month.`,
        severity: "warning", category: cat.category,
      });
    }
  }

  // 3. Overspending alerts
  for (const alert of alerts.slice(0, 3)) {
    recs.push({
      id: nextId(), title: `${alert.label} over budget`,
      message: `Spending Rp${Math.round(alert.currentSpend / 1000)}k vs average Rp${Math.round(alert.averageSpend / 1000)}k. ${alert.overagePercent}% above threshold.`,
      severity: alert.overagePercent > 50 ? "critical" : "warning",
      category: alert.category,
    });
  }

  // 4. Goal progress
  for (const g of goalForecasts) {
    if (!g.onTrack && g.estimatedMonths > 0) {
      recs.push({
        id: nextId(), title: `${g.goalName} behind schedule`,
        message: `At your current rate, ${g.goalName} will take ${g.estimatedMonths} months to reach. Consider increasing your contribution.`,
        severity: "warning",
        actionLabel: "View Goal",
        actionHref: "/goals/" + (goals.find((x) => x.id === g.goalId)?.type === "emergency" ? "emergency" : "graduation"),
      });
    }
    if (g.progressPercent >= 75 && g.progressPercent < 100) {
      recs.push({
        id: nextId(), title: `${g.goalName} almost there!`,
        message: `You're ${g.progressPercent}% of the way to your ${g.goalName}. Just Rp${Math.round(g.remaining / 1000)}k to go!`,
        severity: "success",
      });
    }
  }

  // 5. Debt warnings
  for (const d of debtForecasts) {
    if (d.nextPayment) {
      const daysUntil = differenceInDays(parseISO(d.nextPayment.dueDate), today);
      if (daysUntil <= 7 && daysUntil >= 0) {
        recs.push({
          id: nextId(), title: `${d.debtName} payment due soon`,
          message: `Rp${Math.round(d.nextPayment.amount / 1000)}k due in ${daysUntil} day${daysUntil === 1 ? "" : "s"} (${d.nextPayment.dueDate}).`,
          severity: daysUntil <= 3 ? "critical" : "warning",
          actionLabel: "View Debt", actionHref: "/debt",
        });
      }
    }
  }

  // 6. Low balance warning
  if (balance < 200_000) {
    recs.push({
      id: nextId(), title: "Low balance alert",
      message: `Your balance is Rp${Math.round(balance / 1000)}k. Be cautious with spending until your next transfer.`,
      severity: "critical",
    });
  }

  // 7. Savings forecast
  const forecast6m = forecasts.find((f) => f.months === 6);
  if (forecast6m && forecast6m.projectedSavings > 0) {
    recs.push({
      id: nextId(), title: "6-month savings projection",
      message: `At your current pace, you'll save approximately Rp${Math.round(forecast6m.projectedSavings / 1000)}k over the next 6 months.`,
      severity: "info",
    });
  } else if (forecast6m && forecast6m.projectedSavings < 0) {
    recs.push({
      id: nextId(), title: "Negative savings trend",
      message: `You're spending more than you earn. Consider cutting back to avoid depleting your savings.`,
      severity: "critical",
    });
  }

  // 8. Merchant concentration
  const merchants = getMerchantAnalysis(transactions);
  if (merchants.length > 0) {
    const totalExpenses = transactions.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
    const topMerchant = merchants[0]!;
    const topPct = totalExpenses > 0 ? Math.round((topMerchant.totalSpent / totalExpenses) * 100) : 0;
    if (topPct > 40) {
      recs.push({
        id: nextId(), title: `High concentration at ${topMerchant.name}`,
        message: `${topPct}% of your spending is at ${topMerchant.name}. Diversifying could help you find better deals.`,
        severity: "info",
      });
    }
  }

  return recs;
}