import { describe, it, expect } from "vitest";
import {
  getDailyTrend,
  get7DaySpending,
  get30DaySpending,
  getMonthlySpending,
  getCategoryBreakdown,
  getIncomeExpenseSummary,
  getMonthlyReport,
  getAvailableMonths,
} from "../analyticsEngine";
import type { Transaction } from "../../types";

const TODAY = new Date("2026-06-20");

function makeTx(overrides: Partial<Transaction> & Pick<Transaction, "amount" | "kind" | "date">): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2, 8)}`,
    category: "food",
    source: "manual",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const transactions: Transaction[] = [
  makeTx({ amount: 15000, kind: "expense", date: "2026-06-20", category: "food", merchant: "Warteg" }),
  makeTx({ amount: 50000, kind: "expense", date: "2026-06-15", category: "food", merchant: "KFC" }),
  makeTx({ amount: 30000, kind: "expense", date: "2026-06-10", category: "transport" }),
  makeTx({ amount: 80000, kind: "expense", date: "2026-06-05", category: "shopping" }),
  makeTx({ amount: 1500000, kind: "income", date: "2026-06-01" }),
  makeTx({ amount: 25000, kind: "expense", date: "2026-05-20", category: "food" }),
  makeTx({ amount: 20000, kind: "expense", date: "2026-05-15", category: "transport" }),
];

describe("analyticsEngine", () => {
  describe("getDailyTrend", () => {
    it("returns one entry per day for requested range", () => {
      const trend = getDailyTrend(transactions, 7, TODAY);
      expect(trend).toHaveLength(7);
    });

    it("includes expense and income for each day", () => {
      const trend = getDailyTrend(transactions, 7, TODAY);
      for (const entry of trend) {
        expect(typeof entry.expense).toBe("number");
        expect(typeof entry.income).toBe("number");
        expect(entry.label).toBeDefined();
        expect(entry.date).toBeDefined();
      }
    });

    it("sums expenses correctly for a given day", () => {
      const trend = getDailyTrend(transactions, 7, TODAY);
      const todayEntry = trend.find((t) => t.date === "2026-06-20");
      expect(todayEntry!.expense).toBe(15000);
    });
  });

  describe("get7DaySpending / get30DaySpending / getMonthlySpending", () => {
    it("get7DaySpending sums expenses in last 7 days", () => {
      const total = get7DaySpending(transactions, TODAY);
      expect(total).toBe(15000 + 50000);
    });

    it("get30DaySpending sums expenses in last 30 days", () => {
      const total = get30DaySpending(transactions, TODAY);
      // May 20 is 31 days before Jun 20, outside the 30-day window (subDays(today, 29))
      expect(total).toBe(15000 + 50000 + 30000 + 80000);
    });

    it("getMonthlySpending sums expenses in current month", () => {
      const total = getMonthlySpending(transactions, TODAY);
      expect(total).toBe(15000 + 50000 + 30000 + 80000);
    });
  });

  describe("getCategoryBreakdown", () => {
    it("returns breakdown sorted by amount descending", () => {
      const breakdown = getCategoryBreakdown(transactions, "expense");
      for (let i = 1; i < breakdown.length; i++) {
        expect(breakdown[i - 1]!.amount).toBeGreaterThanOrEqual(breakdown[i]!.amount);
      }
    });

    it("calculates correct percentages", () => {
      const breakdown = getCategoryBreakdown(transactions, "expense");
      const totalPct = breakdown.reduce((s, b) => s + b.percentage, 0);
      expect(totalPct).toBeGreaterThanOrEqual(99);
      expect(totalPct).toBeLessThanOrEqual(101);
    });

    it("counts transactions per category", () => {
      const breakdown = getCategoryBreakdown(transactions, "expense");
      const food = breakdown.find((b) => b.category === "food");
      expect(food).toBeDefined();
      expect(food!.count).toBe(3);
    });

    it("returns empty array for no matching transactions", () => {
      const breakdown = getCategoryBreakdown([], "expense");
      expect(breakdown).toEqual([]);
    });
  });

  describe("getIncomeExpenseSummary", () => {
    it("computes total income and expense", () => {
      const summary = getIncomeExpenseSummary(transactions);
      expect(summary.totalIncome).toBe(1500000);
      expect(summary.totalExpense).toBe(15000 + 50000 + 30000 + 80000 + 25000 + 20000);
      expect(summary.net).toBe(summary.totalIncome - summary.totalExpense);
    });

    it("computes savings rate", () => {
      const summary = getIncomeExpenseSummary(transactions);
      expect(summary.savingsRate).toBe(Math.round((summary.net / summary.totalIncome) * 100));
    });

    it("returns 0 savings rate for no income", () => {
      const expenseOnly = [makeTx({ amount: 10000, kind: "expense", date: "2026-06-10" })];
      const summary = getIncomeExpenseSummary(expenseOnly);
      expect(summary.savingsRate).toBe(0);
    });
  });

  describe("getMonthlyReport", () => {
    it("generates report for a specific month", () => {
      const report = getMonthlyReport(transactions, 2026, 6);
      expect(report.month).toBe("2026-06");
      expect(report.monthLabel).toBe("June 2026");
      expect(report.totalExpense).toBe(15000 + 50000 + 30000 + 80000);
      expect(report.totalIncome).toBe(1500000);
      expect(report.transactionCount).toBe(5);
    });

    it("identifies biggest category", () => {
      const report = getMonthlyReport(transactions, 2026, 6);
      expect(report.biggestCategory).not.toBeNull();
    });

    it("identifies top merchant", () => {
      const report = getMonthlyReport(transactions, 2026, 6);
      expect(report.topMerchant).not.toBeNull();
    });

    it("includes daily trend for every day of the month", () => {
      const report = getMonthlyReport(transactions, 2026, 6);
      expect(report.dailyTrend).toHaveLength(30); // June has 30 days
    });

    it("handles month with no transactions", () => {
      const report = getMonthlyReport(transactions, 2026, 1);
      expect(report.totalExpense).toBe(0);
      expect(report.totalIncome).toBe(0);
      expect(report.biggestCategory).toBeNull();
      expect(report.topMerchant).toBeNull();
    });
  });

  describe("getAvailableMonths", () => {
    it("returns unique months sorted descending", () => {
      const months = getAvailableMonths(transactions);
      expect(months.length).toBeGreaterThanOrEqual(2);
      expect(months[0]!.year).toBe(2026);
      expect(months[0]!.month).toBe(6);
    });

    it("returns empty array for no transactions", () => {
      expect(getAvailableMonths([])).toEqual([]);
    });
  });
});
