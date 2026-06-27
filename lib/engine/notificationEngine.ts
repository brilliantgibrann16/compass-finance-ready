import { differenceInCalendarDays, parseISO, format } from "date-fns";
import type { AppData, AppNotification } from "@/lib/types";
import { formatRupiah, formatRupiahCompact } from "@/lib/utils/currency";
import { getCurrentCycle } from "@/lib/engine/transferCycle";

/**
 * Generates notifications based on current app state.
 * Called periodically (e.g. on app load) to create relevant alerts.
 * Returns only new notifications — deduplication by id prefix.
 */
export function generateNotifications(
  data: AppData,
  today: Date = new Date()
): Omit<AppNotification, "id" | "isRead">[] {
  const notifications: Omit<AppNotification, "id" | "isRead">[] = [];
  const todayStr = today.toISOString().slice(0, 10);

  // === DEBT DUE DATE ALERTS ===
  const allInstallments = data.debts.flatMap((d) =>
    d.installments.map((i) => ({ ...i, debtName: d.name }))
  );

  for (const inst of allInstallments) {
    if (inst.isPaid) continue;
    const dueDate = parseISO(inst.dueDate);
    const daysUntil = differenceInCalendarDays(dueDate, today);

    if (daysUntil === 3) {
      notifications.push({
        type: "warning",
        title: "Payment due in 3 days",
        message: `${inst.debtName} installment of ${formatRupiah(inst.amount)} is due on ${format(dueDate, "d MMM")}.`,
        date: todayStr,
        href: "/debt",
      });
    } else if (daysUntil === 1) {
      notifications.push({
        type: "warning",
        title: "Payment due tomorrow!",
        message: `${inst.debtName}: ${formatRupiah(inst.amount)} due tomorrow.`,
        date: todayStr,
        href: "/debt",
      });
    } else if (daysUntil === 0) {
      notifications.push({
        type: "warning",
        title: "Payment due today",
        message: `${inst.debtName}: ${formatRupiah(inst.amount)} is due today!`,
        date: todayStr,
        href: "/debt",
      });
    } else if (daysUntil < 0) {
      notifications.push({
        type: "warning",
        title: "Overdue payment",
        message: `${inst.debtName} installment of ${formatRupiah(inst.amount)} was due on ${format(dueDate, "d MMM")}. Mark it as paid if completed.`,
        date: todayStr,
        href: "/debt",
      });
    }
  }

  // === OVERSPENDING ALERT ===
  const monthlyBudget = data.transferSettings.amountPerTransfer * 2;
  const thisMonthExpenses = data.transactions
    .filter((t) => t.kind === "expense" && t.date.startsWith(todayStr.slice(0, 7)))
    .reduce((sum, t) => sum + t.amount, 0);

  if (thisMonthExpenses > monthlyBudget * 0.8) {
    notifications.push({
      type: "warning",
      title: "High spending this month",
      message: `You've spent ${formatRupiahCompact(thisMonthExpenses)} this month — that's ${Math.round((thisMonthExpenses / monthlyBudget) * 100)}% of your monthly budget.`,
      date: todayStr,
      href: "/insights",
    });
  }

  // === GOAL MILESTONES ===
  for (const goal of data.savingsGoals) {
    const pct = Math.round((goal.currentAmount / goal.targetAmount) * 100);
    const milestones = [25, 50, 75, 100];
    for (const m of milestones) {
      if (pct >= m && !goal.milestonesReached.includes(m)) {
        notifications.push({
          type: "success",
          title: `${goal.name} milestone! 🎉`,
          message: `You've reached ${m}% of your ${goal.name} target (${formatRupiahCompact(goal.currentAmount)}).`,
          date: todayStr,
          href: goal.type === "graduation" ? "/goals/graduation" : "/goals/emergency",
        });
      }
    }
  }

  // === WISHLIST MILESTONES ===
  for (const item of data.wishlist) {
    const pct = item.targetAmount > 0 ? Math.round((item.savedAmount / item.targetAmount) * 100) : 0;
    if (pct >= 50 && pct < 100) {
      notifications.push({
        type: "success",
        title: `Halfway to ${item.name}!`,
        message: `You've saved ${formatRupiahCompact(item.savedAmount)} of ${formatRupiahCompact(item.targetAmount)} for your ${item.name}.`,
        date: todayStr,
        href: "/wishlist",
      });
    }
    if (pct >= 100) {
      notifications.push({
        type: "success",
        title: `You can buy ${item.name}! 🎉`,
        message: `You've saved enough for your ${item.name}. Time to treat yourself!`,
        date: todayStr,
        href: "/wishlist",
      });
    }
  }

  // === TRANSFER DAY REMINDERS ===
  const cycle = getCurrentCycle(today, data.transferSettings);
  const daysUntilTransfer = cycle.daysUntilNextTransfer;
  if (daysUntilTransfer === 1) {
    notifications.push({
      type: "reminder",
      title: "Transfer day tomorrow",
      message: `Your next allowance transfer of ${formatRupiah(data.transferSettings.amountPerTransfer)} arrives tomorrow.`,
      date: todayStr,
    });
  } else if (daysUntilTransfer === 0) {
    notifications.push({
      type: "reminder",
      title: "Transfer day!",
      message: `Your ${formatRupiah(data.transferSettings.amountPerTransfer)} allowance should arrive today.`,
      date: todayStr,
    });
  }

  return notifications;
}
