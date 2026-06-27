import type { Transaction, Debt, SavingsGoal, WishlistItem, TransferSettings } from "@/lib/types";
import { getCategoryBreakdown, getDailySpending } from "@/lib/engine/insightsEngine";
import { getAllDebtsSummary } from "@/lib/engine/debtEngine";
import { getGoalProjection } from "@/lib/engine/goalProjection";
import { formatRupiah, formatRupiahCompact } from "@/lib/utils/currency";

export type CoachTipType = "spending" | "savings" | "debt" | "goal";

export interface CoachTip {
  id: string;
  message: string;
  type: CoachTipType;
  priority: number;
  icon: string;
}

/**
 * Deterministic, local-first coaching engine.
 * No AI API — uses rule-based logic derived from the user's actual data.
 *
 * Each rule checks a condition and emits a tip if triggered.
 * Tips are sorted by priority (higher = more actionable).
 */
export function generateCoachTips(
  transactions: Transaction[],
  debts: Debt[],
  savingsGoals: SavingsGoal[],
  wishlist: WishlistItem[],
  transferSettings: TransferSettings,
  balance: number,
  today: Date = new Date()
): CoachTip[] {
  const tips: CoachTip[] = [];
  const monthlyIncome = transferSettings.amountPerTransfer * 2;
  const categories = getCategoryBreakdown(transactions, 30, today);
  const dailySpending = getDailySpending(transactions, 7, today);
  const debtSummary = getAllDebtsSummary(debts);

  // === SPENDING RULES ===

  // Find top food spending and suggest specific cut
  const foodCategory = categories.find((c) => c.category === "food");
  if (foodCategory && foodCategory.percentage > 30) {
    // Estimate per-meal cost from food transactions
    const foodTxCount = transactions.filter(
      (t) => t.kind === "expense" && t.category === "food" &&
      new Date(t.date) >= new Date(today.getFullYear(), today.getMonth(), 1)
    ).length;
    const avgMealCost = foodTxCount > 0 ? Math.round(foodCategory.amount / foodTxCount) : 22_000;
    const skipCount = 2;
    const savings = avgMealCost * skipCount;

    tips.push({
      id: "skip-food",
      message: `Skip ${skipCount} jajan purchases this week and save ${formatRupiah(savings)}.`,
      type: "spending",
      priority: 9,
      icon: "UtensilsCrossed",
    });
  }

  // Daily overspending warning
  const todaySpent = dailySpending[dailySpending.length - 1]?.amount ?? 0;
  const safeDailyLimit = balance > 0 ? Math.round(balance / Math.max(1, 15)) : 0;
  if (todaySpent > safeDailyLimit && safeDailyLimit > 0) {
    tips.push({
      id: "daily-overspend",
      message: `You've spent ${formatRupiah(todaySpent)} today, which exceeds your daily safe limit of ${formatRupiah(safeDailyLimit)}.`,
      type: "spending",
      priority: 10,
      icon: "AlertTriangle",
    });
  }

  // Suggest transport savings
  const transportCat = categories.find((c) => c.category === "transport");
  if (transportCat && transportCat.percentage > 15) {
    tips.push({
      id: "transport-tip",
      message: `Transport takes ${transportCat.percentage}% of spending. Try walking for short trips to save ${formatRupiahCompact(Math.round(transportCat.amount * 0.2))}/month.`,
      type: "spending",
      priority: 6,
      icon: "Bike",
    });
  }

  // === SAVINGS RULES ===

  // Can safely save more
  const totalGoalContrib = savingsGoals.reduce((s, g) => s + g.monthlyContribution, 0);
  const estimatedMonthlyExpenses = categories.reduce((s, c) => s + c.amount, 0);
  const surplus = monthlyIncome - estimatedMonthlyExpenses - totalGoalContrib;
  if (surplus > 50_000) {
    const safeExtra = Math.round(surplus * 0.5);
    tips.push({
      id: "extra-savings",
      message: `You can safely save ${formatRupiah(safeExtra)} more this month based on your current spending pattern.`,
      type: "savings",
      priority: 7,
      icon: "PiggyBank",
    });
  }

  // Emergency fund tip
  const emergencyGoal = savingsGoals.find((g) => g.type === "emergency");
  if (emergencyGoal && emergencyGoal.currentAmount < monthlyIncome * 3) {
    const monthsToThreeMonths = Math.ceil((monthlyIncome * 3 - emergencyGoal.currentAmount) / emergencyGoal.monthlyContribution);
    if (Number.isFinite(monthsToThreeMonths)) {
      tips.push({
        id: "emergency-fund",
        message: `Your emergency fund covers ${Math.round((emergencyGoal.currentAmount / monthlyIncome) * 100)}% of 3 months' income. ${monthsToThreeMonths} months to reach the safe zone.`,
        type: "savings",
        priority: 5,
        icon: "ShieldCheck",
      });
    }
  }

  // === DEBT RULES ===

  if (!debtSummary.isAllPaidOff) {
    // Upcoming payment reminder
    if (debtSummary.nextDueDate) {
      const daysUntilDue = Math.ceil((new Date(debtSummary.nextDueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 7 && daysUntilDue > 0) {
        tips.push({
          id: "debt-due-soon",
          message: `Debt payment of ${formatRupiah(debtSummary.nextDueAmount)} due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}. Make sure you have enough set aside.`,
          type: "debt",
          priority: 10,
          icon: "Clock",
        });
      }
    }

    // Debt progress encouragement
    if (debtSummary.progressPct >= 50) {
      tips.push({
        id: "debt-halfway",
        message: `You've paid off ${debtSummary.progressPct}% of your total debt! The finish line is in sight.`,
        type: "debt",
        priority: 4,
        icon: "Trophy",
      });
    }
  }

  // === GOAL RULES ===

  for (const goal of savingsGoals) {
    const projection = getGoalProjection(goal, today);
    if (projection.isOnTrack === false && goal.targetDate) {
      const needed = (goal.targetAmount - goal.currentAmount);
      const monthsLeft = Math.max(1, Math.ceil((new Date(goal.targetDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const requiredMonthly = Math.ceil(needed / monthsLeft);
      const increase = requiredMonthly - goal.monthlyContribution;
      if (increase > 0) {
        tips.push({
          id: `goal-boost-${goal.id}`,
          message: `Increase your ${goal.name} contribution by ${formatRupiah(increase)}/month to stay on track for your target date.`,
          type: "goal",
          priority: 8,
          icon: "Target",
        });
      }
    }
  }

  // Wishlist acceleration
  for (const item of wishlist) {
    const remaining = item.targetAmount - item.savedAmount;
    if (remaining > 0 && remaining <= monthlyIncome * 0.3) {
      tips.push({
        id: `wishlist-close-${item.id}`,
        message: `Only ${formatRupiahCompact(remaining)} left for your ${item.name}. One focused month could get you there!`,
        type: "goal",
        priority: 3,
        icon: "Sparkles",
      });
    }
  }

  return tips.sort((a, b) => b.priority - a.priority);
}
