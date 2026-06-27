import { differenceInCalendarDays, differenceInCalendarMonths, format, parseISO } from "date-fns";
import type { Debt, DebtInstallment } from "@/lib/types";

/** The user's stated debt-free target. Separate from the date actually
 *  implied by the last unpaid installment — see getDebtFreeCountdown. */
export const DEBT_FREE_TARGET_DATE = new Date("2027-05-01");

export interface DebtSummary {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  isPaidOff: boolean;
  nextDueInstallment: DebtInstallment | null;
}

export function getDebtSummary(debt: Debt): DebtSummary {
  const totalAmount = debt.installments.reduce((sum, i) => sum + i.amount, 0);
  const paidAmount = debt.installments
    .filter((i) => i.isPaid)
    .reduce((sum, i) => sum + i.amount, 0);
  const remainingAmount = totalAmount - paidAmount;
  const isPaidOff = debt.installments.every((i) => i.isPaid);

  const nextDueInstallment =
    debt.installments
      .filter((i) => !i.isPaid)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null;

  return { totalAmount, paidAmount, remainingAmount, isPaidOff, nextDueInstallment };
}

export interface AllDebtsSummary {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  progressPct: number;
  isAllPaidOff: boolean;
  nextDueDate: string | null;
  nextDueAmount: number;
  /** The due date of the very last unpaid installment across all debts —
   *  i.e. the date the data actually implies "debt free", as opposed
   *  to the user's stated target date. */
  lastUnpaidDueDate: string | null;
}

export function getAllDebtsSummary(debts: Debt[]): AllDebtsSummary {
  const summaries = debts.map(getDebtSummary);
  const totalAmount = summaries.reduce((sum, s) => sum + s.totalAmount, 0);
  const paidAmount = summaries.reduce((sum, s) => sum + s.paidAmount, 0);
  const remainingAmount = totalAmount - paidAmount;
  const isAllPaidOff = summaries.every((s) => s.isPaidOff);

  const allUnpaid = debts
    .flatMap((d) => d.installments)
    .filter((i) => !i.isPaid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const nextDue = allUnpaid[0] ?? null;
  const lastUnpaid = allUnpaid[allUnpaid.length - 1] ?? null;

  return {
    totalAmount,
    paidAmount,
    remainingAmount,
    progressPct: totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 100,
    isAllPaidOff,
    nextDueDate: nextDue?.dueDate ?? null,
    nextDueAmount: nextDue?.amount ?? 0,
    lastUnpaidDueDate: lastUnpaid?.dueDate ?? null,
  };
}

export interface DebtFreeCountdown {
  daysUntilTarget: number;
  monthsUntilTarget: number;
  targetLabel: string;
  /** Whether the data-implied finish (last unpaid installment) lands
   *  on or before the stated target date. Null once all debts are paid. */
  isOnTrack: boolean | null;
  actualProjectedLabel: string | null;
}

export function getDebtFreeCountdown(
  debts: Debt[],
  today: Date = new Date(),
  targetDate: Date = DEBT_FREE_TARGET_DATE
): DebtFreeCountdown {
  const summary = getAllDebtsSummary(debts);

  const daysUntilTarget = Math.max(0, differenceInCalendarDays(targetDate, today));
  const monthsUntilTarget = Math.max(0, differenceInCalendarMonths(targetDate, today));

  let isOnTrack: boolean | null = null;
  let actualProjectedLabel: string | null = null;

  if (!summary.isAllPaidOff && summary.lastUnpaidDueDate) {
    const lastDate = parseISO(summary.lastUnpaidDueDate);
    isOnTrack = differenceInCalendarMonths(targetDate, lastDate) >= 0;
    actualProjectedLabel = format(lastDate, "MMM yyyy");
  }

  return {
    daysUntilTarget,
    monthsUntilTarget,
    targetLabel: format(targetDate, "MMMM yyyy"),
    isOnTrack,
    actualProjectedLabel,
  };
}

export interface TimelineMonth {
  monthKey: string; // "2026-06"
  monthLabel: string; // "Jun 2026"
  monthTotal: number;
  isFullyPaid: boolean;
  entries: { debtName: string; installment: DebtInstallment }[];
}

/** Groups every installment across all debts into a chronological,
 *  month-by-month timeline for the Debt-Free Mode screen. */
export function getMonthlyTimeline(debts: Debt[]): TimelineMonth[] {
  const byMonth = new Map<string, TimelineMonth>();

  for (const debt of debts) {
    for (const installment of debt.installments) {
      const monthKey = installment.dueDate.slice(0, 7);
      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, {
          monthKey,
          monthLabel: format(parseISO(`${monthKey}-01`), "MMM yyyy"),
          monthTotal: 0,
          isFullyPaid: true,
          entries: [],
        });
      }
      const bucket = byMonth.get(monthKey)!;
      bucket.monthTotal += installment.amount;
      bucket.isFullyPaid = bucket.isFullyPaid && installment.isPaid;
      bucket.entries.push({ debtName: debt.name, installment });
    }
  }

  return Array.from(byMonth.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}
