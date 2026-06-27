import { isSameDay, parseISO, subDays, format, endOfWeek, eachDayOfInterval, eachWeekOfInterval, startOfMonth, endOfMonth } from "date-fns";
import type { Transaction, TransferSettings, Debt, SavingsGoal, WishlistItem, CategoryId } from "@/lib/types";
import { CATEGORIES } from "@/lib/engine/categoryDetector";
import { getAllDebtsSummary } from "@/lib/engine/debtEngine";
import { formatRupiah, formatRupiahCompact } from "@/lib/utils/currency";
import { filterByDateRange, filterByKind, sumAmount } from "@/lib/engine/transactionUtils";

export interface Insight {
  id: string;
  message: string;
  type: "info" | "warning" | "success" | "tip";
  icon: string; // lucide icon name
  priority: number; // higher = more important
}

export interface CategorySpend {
  category: CategoryId;
  label: string;
  color: string;
  amount: number;
  percentage: number;
}

export interface DailySpend {
  date: string;
  label: string;
  amount: number;
}

export interface WeeklySpend {
  weekStart: string;
  label: string;
  amount: number;
}

export type ChartPeriod = "7d" | "30d" | "90d";

function getExpenses(transactions: Transaction[], startDate: Date, endDate: Date): Transaction[] {
  return filterByKind(filterByDateRange(transactions, startDate, endDate), "expense");
}

export function getCategoryBreakdown(
  transactions: Transaction[],
  days: number = 30,
  today: Date = new Date()
): CategorySpend[] {
  const startDate = subDays(today, days);
  const expenses = getExpenses(transactions, startDate, today);
  const totalSpent = sumAmount(expenses);

  const byCategory = new Map<CategoryId, number>();
  for (const tx of expenses) {
    byCategory.set(tx.category, (byCategory.get(tx.category) ?? 0) + tx.amount);
  }

  return Array.from(byCategory.entries())
    .map(([category, amount]) => ({
      category,
      label: CATEGORIES[category].label,
      color: CATEGORIES[category].color,
      amount,
      percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getDailySpending(
  transactions: Transaction[],
  days: number = 7,
  today: Date = new Date()
): DailySpend[] {
  const startDate = subDays(today, days - 1);
  const allDays = eachDayOfInterval({ start: startDate, end: today });

  return allDays.map((day) => {
    const dayExpenses = transactions.filter(
      (t) => t.kind === "expense" && isSameDay(parseISO(t.date), day)
    );
    return {
      date: format(day, "yyyy-MM-dd"),
      label: format(day, "EEE"),
      amount: dayExpenses.reduce((sum, t) => sum + t.amount, 0),
    };
  });
}

export function getWeeklySpending(
  transactions: Transaction[],
  weeks: number = 12,
  today: Date = new Date()
): WeeklySpend[] {
  const startDate = subDays(today, weeks * 7);
  const weekStarts = eachWeekOfInterval({ start: startDate, end: today }, { weekStartsOn: 1 });

  return weekStarts.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekExpenses = getExpenses(transactions, weekStart, weekEnd);
    return {
      weekStart: format(weekStart, "yyyy-MM-dd"),
      label: format(weekStart, "d MMM"),
      amount: weekExpenses.reduce((sum, t) => sum + t.amount, 0),
    };
  });
}

export function getMonthlySpending(
  transactions: Transaction[],
  months: number = 6,
  today: Date = new Date()
): { month: string; label: string; amount: number }[] {
  const result: { month: string; label: string; amount: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const targetMonth = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);
    const monthExpenses = getExpenses(transactions, monthStart, monthEnd);

    result.push({
      month: format(targetMonth, "yyyy-MM"),
      label: format(targetMonth, "MMM"),
      amount: monthExpenses.reduce((sum, t) => sum + t.amount, 0),
    });
  }

  return result;
}

export function generateInsights(
  transactions: Transaction[],
  debts: Debt[],
  savingsGoals: SavingsGoal[],
  wishlist: WishlistItem[],
  transferSettings: TransferSettings,
  today: Date = new Date()
): Insight[] {
  const insights: Insight[] = [];
  const categories = getCategoryBreakdown(transactions, 30, today);
  const monthlyIncome = transferSettings.amountPerTransfer * 2;

  // Category-based insights
  const topCategory = categories[0];
  if (topCategory && topCategory.percentage > 30) {
    insights.push({
      id: "top-category",
      message: `You spend ${topCategory.percentage}% of your money on ${topCategory.label.toLowerCase()}.`,
      type: "info",
      icon: "PieChart",
      priority: 8,
    });
  }

  // Savings acceleration insight
  if (topCategory && topCategory.percentage > 25) {
    const reductionPct = 15;
    const savingsGain = Math.round(topCategory.amount * (reductionPct / 100));
    const primaryGoal = savingsGoals[0];
    if (primaryGoal) {
      const currentMonthlyContrib = primaryGoal.monthlyContribution;
      const boostedContrib = currentMonthlyContrib + savingsGain;
      const remaining = primaryGoal.targetAmount - primaryGoal.currentAmount;
      const currentMonths = currentMonthlyContrib > 0 ? Math.ceil(remaining / currentMonthlyContrib) : Infinity;
      const boostedMonths = boostedContrib > 0 ? Math.ceil(remaining / boostedContrib) : Infinity;
      const monthsSaved = currentMonths - boostedMonths;

      if (monthsSaved > 0 && Number.isFinite(monthsSaved)) {
        insights.push({
          id: "savings-acceleration",
          message: `If you reduce ${topCategory.label.toLowerCase()} spending by ${reductionPct}%, your ${primaryGoal.name} reaches target ${monthsSaved} month${monthsSaved === 1 ? "" : "s"} earlier.`,
          type: "tip",
          icon: "TrendingUp",
          priority: 9,
        });
      }
    }
  }

  // Spending pace insight
  const last7Days = getDailySpending(transactions, 7, today);
  const avgDaily7 = last7Days.reduce((s, d) => s + d.amount, 0) / 7;
  const safeDailyBudget = monthlyIncome / 30;

  if (avgDaily7 < safeDailyBudget * 0.85) {
    insights.push({
      id: "spending-pace",
      message: "You are currently ahead of your spending pace. Keep it up!",
      type: "success",
      icon: "Zap",
      priority: 7,
    });
  } else if (avgDaily7 > safeDailyBudget * 1.15) {
    insights.push({
      id: "spending-pace-warning",
      message: `Your daily average this week (${formatRupiah(Math.round(avgDaily7))}) exceeds your safe daily budget. Consider cutting back.`,
      type: "warning",
      icon: "AlertTriangle",
      priority: 9,
    });
  }

  // Debt insight
  const debtSummary = getAllDebtsSummary(debts);
  if (!debtSummary.isAllPaidOff && debtSummary.lastUnpaidDueDate) {
    const lastDate = parseISO(debtSummary.lastUnpaidDueDate);
    const targetDate = new Date("2027-05-01");
    if (lastDate <= targetDate) {
      insights.push({
        id: "debt-on-track",
        message: "Your current debt payoff schedule finishes before your target date. Great progress!",
        type: "success",
        icon: "CheckCircle",
        priority: 6,
      });
    }
  }

  // Wishlist insight
  for (const item of wishlist) {
    const pct = item.targetAmount > 0 ? Math.round((item.savedAmount / item.targetAmount) * 100) : 0;
    if (pct >= 75 && pct < 100) {
      insights.push({
        id: `wishlist-close-${item.id}`,
        message: `You're ${pct}% of the way to your ${item.name}! Only ${formatRupiahCompact(item.targetAmount - item.savedAmount)} to go.`,
        type: "success",
        icon: "Star",
        priority: 5,
      });
    }
  }

  // Low spending day streak
  const lowDays = last7Days.filter((d) => d.amount <= safeDailyBudget * 0.5).length;
  if (lowDays >= 4) {
    insights.push({
      id: "frugal-streak",
      message: `${lowDays} out of the last 7 days were below-budget days. Your discipline is paying off!`,
      type: "success",
      icon: "Award",
      priority: 4,
    });
  }

  // Monthly savings commitment ratio
  const totalMonthlyGoalContrib = savingsGoals.reduce((s, g) => s + g.monthlyContribution, 0);
  const savingsRatio = monthlyIncome > 0 ? Math.round((totalMonthlyGoalContrib / monthlyIncome) * 100) : 0;
  if (savingsRatio >= 20) {
    insights.push({
      id: "savings-ratio",
      message: `You're saving ${savingsRatio}% of your monthly income toward goals. Financial experts recommend at least 20%.`,
      type: "success",
      icon: "PiggyBank",
      priority: 3,
    });
  } else if (savingsRatio < 10) {
    insights.push({
      id: "savings-ratio-low",
      message: `Only ${savingsRatio}% of income goes toward savings goals. Try to increase to at least 20%.`,
      type: "warning",
      icon: "PiggyBank",
      priority: 7,
    });
  }

  return insights.sort((a, b) => b.priority - a.priority);
}
