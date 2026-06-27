// lib/engine/__tests__/analyticsEngine.test.ts
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
import type { Transaction } from "@/lib/types";

const today = new Date("2026-06-20");

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2)}`,
    amount: 10_000,
    kind: "expense",
    category: "food",
    date: "2026-06-20",
    source: "manual",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Analytics Engine", () => {
  describe("getDailyTrend", () => {
    it("returns correct daily trend mapping for expense and income", () => {
      const txs = [
        makeTx({ amount: 15_000, date: "2026-06-20", kind: "expense" }),
        makeTx({ amount: 50_000, date: "2026-06-19", kind: "income" }),
        makeTx({ amount: 10_000, date: "2026-06-19", kind: "expense" }),
      ];
      const trend = getDailyTrend(txs, 3, today);
      expect(trend).toHaveLength(3);
      expect(trend[2].date).toBe("2026-06-20");
      expect(trend[2].expense).toBe(15_000);
      expect(trend[2].income).toBe(0);
      
      expect(trend[1].date).toBe("2026-06-19");
      expect(trend[1].expense).toBe(10_000);
      expect(trend[1].income).toBe(50_000);
    });
  });

  describe("Spending sums (7d, 30d, Monthly)", () => {
    const txs = [
      makeTx({ amount: 50_000, date: "2026-06-20", kind: "expense" }), // today
      makeTx({ amount: 30_000, date: "2026-06-15", kind: "expense" }), // 5 days ago (in 7d)
      makeTx({ amount: 20_000, date: "2026-06-01", kind: "expense" }), // 19 days ago (in 30d, in month)
      makeTx({ amount: 10_000, date: "2026-05-20", kind: "expense" }), // outside 30d, outside month
      makeTx({ amount: 100_000, date: "2026-06-10", kind: "income" }), // income, ignored in spending
    ];

    it("calculates 7-day spending sum", () => {
      expect(get7DaySpending(txs, today)).toBe(80_000); // 50k + 30k
    });

    it("calculates 30-day spending sum", () => {
      expect(get30DaySpending(txs, today)).toBe(100_000); // 50k + 30k + 20k
    });

    it("calculates monthly spending sum", () => {
      expect(getMonthlySpending(txs, today)).toBe(100_000); // June transactions only (50k + 30k + 20k)
    });
  });

  describe("getCategoryBreakdown", () => {
    it("returns correctly grouped categories with percentages", () => {
      const txs = [
        makeTx({ amount: 60_000, category: "food", kind: "expense" }),
        makeTx({ amount: 40_000, category: "transport", kind: "expense" }),
      ];
      const breakdown = getCategoryBreakdown(txs, "expense");
      expect(breakdown).toHaveLength(2);
      expect(breakdown[0].category).toBe("food");
      expect(breakdown[0].amount).toBe(60_000);
      expect(breakdown[0].percentage).toBe(60);
      expect(breakdown[0].count).toBe(1);

      expect(breakdown[1].category).toBe("transport");
      expect(breakdown[1].percentage).toBe(40);
    });

    it("handles zero total gracefully", () => {
      const breakdown = getCategoryBreakdown([], "expense");
      expect(breakdown).toHaveLength(0);
    });
  });

  describe("getIncomeExpenseSummary", () => {
    it("computes net and savings rate", () => {
      const txs = [
        makeTx({ amount: 1_000_000, kind: "income" }),
        makeTx({ amount: 400_000, kind: "expense" }),
      ];
      const summary = getIncomeExpenseSummary(txs);
      expect(summary.totalIncome).toBe(1_000_000);
      expect(summary.totalExpense).toBe(400_000);
      expect(summary.net).toBe(600_000);
      expect(summary.savingsRate).toBe(60);
    });
  });

  describe("getMonthlyReport", () => {
    it("generates comprehensive monthly report", () => {
      const txs = [
        makeTx({ amount: 100_000, kind: "expense", date: "2026-06-15", category: "food", merchant: "Warteg" }),
        makeTx({ amount: 50_000, kind: "expense", date: "2026-06-16", category: "food", merchant: "Warteg" }),
        makeTx({ amount: 500_000, kind: "income", date: "2026-06-01" }),
      ];
      const report = getMonthlyReport(txs, 2026, 6);
      expect(report.month).toBe("2026-06");
      expect(report.totalIncome).toBe(500_000);
      expect(report.totalExpense).toBe(150_000);
      expect(report.netSavings).toBe(350_000);
      expect(report.savingsRate).toBe(70);
      expect(report.biggestCategory!.category).toBe("food");
      expect(report.topMerchant!.name).toBe("Warteg");
      expect(report.topMerchant!.amount).toBe(150_000);
      expect(report.topMerchant!.count).toBe(2);
      expect(report.dailyTrend).toHaveLength(30); // June has 30 days
    });
  });

  describe("getAvailableMonths", () => {
    it("returns sorted unique months present in transactions", () => {
      const txs = [
        makeTx({ date: "2026-06-15" }),
        makeTx({ date: "2026-05-10" }),
        makeTx({ date: "2026-06-01" }),
      ];
      const months = getAvailableMonths(txs);
      expect(months).toHaveLength(2);
      expect(months[0].label).toBe("June 2026");
      expect(months[1].label).toBe("May 2026");
    });
  });
});
