// lib/engine/__tests__/insightsEngine.test.ts
import { describe, it, expect } from "vitest";
import {
  getCategoryBreakdown,
  getDailySpending,
  getWeeklySpending,
  getMonthlySpending,
  generateInsights,
} from "../insightsEngine";
import type { Transaction, Debt, SavingsGoal, WishlistItem, TransferSettings } from "@/lib/types";

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

describe("Insights Engine", () => {
  describe("getCategoryBreakdown", () => {
    it("returns category breakdown for specified interval of days", () => {
      const txs = [
        makeTx({ amount: 50_000, date: "2026-06-20", category: "food" }),
        makeTx({ amount: 30_000, date: "2026-06-10", category: "transport" }),
        makeTx({ amount: 10_000, date: "2026-05-10", category: "shopping" }), // outside 30 days
      ];
      const breakdown = getCategoryBreakdown(txs, 30, today);
      expect(breakdown).toHaveLength(2);
      expect(breakdown[0].category).toBe("food");
      expect(breakdown[0].amount).toBe(50_000);
      expect(breakdown[0].percentage).toBe(63); // 50k / 80k

      expect(breakdown[1].category).toBe("transport");
      expect(breakdown[1].amount).toBe(30_000);
      expect(breakdown[1].percentage).toBe(38); // 30k / 80k
    });
  });

  describe("getDailySpending", () => {
    it("returns daily spending array for interval of days", () => {
      const txs = [
        makeTx({ amount: 20_000, date: "2026-06-20" }),
        makeTx({ amount: 15_000, date: "2026-06-19" }),
      ];
      const daily = getDailySpending(txs, 3, today);
      expect(daily).toHaveLength(3);
      expect(daily[2].date).toBe("2026-06-20");
      expect(daily[2].amount).toBe(20_000);
      expect(daily[1].date).toBe("2026-06-19");
      expect(daily[1].amount).toBe(15_000);
      expect(daily[0].date).toBe("2026-06-18");
      expect(daily[0].amount).toBe(0);
    });
  });

  describe("getWeeklySpending", () => {
    it("returns weekly spending data array", () => {
      const txs = [
        makeTx({ amount: 10_000, date: "2026-06-20" }), // current week
        makeTx({ amount: 20_000, date: "2026-06-10" }), // previous week
      ];
      const weekly = getWeeklySpending(txs, 2, today);
      expect(weekly.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getMonthlySpending", () => {
    it("returns monthly spend summary array", () => {
      const txs = [
        makeTx({ amount: 30_000, date: "2026-06-10" }),
        makeTx({ amount: 15_000, date: "2026-05-15" }),
      ];
      const monthly = getMonthlySpending(txs, 3, today);
      expect(monthly).toHaveLength(3);
      expect(monthly[2].month).toBe("2026-06");
      expect(monthly[2].amount).toBe(30_000);
      expect(monthly[1].month).toBe("2026-05");
      expect(monthly[1].amount).toBe(15_000);
    });
  });

  describe("generateInsights", () => {
    const settings: TransferSettings = {
      balance: 750_000,
      dayOne: 1,
      dayTwo: 15,
      amountPerTransfer: 750_000,
    };

    const emptyDebts: Debt[] = [];
    const emptyGoals: SavingsGoal[] = [];
    const emptyWishlist: WishlistItem[] = [];

    it("triggers top-category insight if spending is heavily skewed", () => {
      const txs = [
        makeTx({ amount: 90_000, category: "food" }),
        makeTx({ amount: 10_000, category: "transport" }),
      ];
      const insights = generateInsights(txs, emptyDebts, emptyGoals, emptyWishlist, settings, today);
      const topCatInsight = insights.find((ins) => ins.id === "top-category");
      expect(topCatInsight).toBeDefined();
      expect(topCatInsight!.type).toBe("info");
    });

    it("triggers savings-acceleration insight if primary goal exists", () => {
      const txs = [
        makeTx({ amount: 100_000, category: "food" }),
      ];
      const goals: SavingsGoal[] = [
        {
          id: "g1",
          name: "Graduation Fund",
          type: "graduation",
          targetAmount: 5_000_000,
          currentAmount: 1_000_000,
          monthlyContribution: 200_000,
          milestonesReached: [],
        },
      ];
      const insights = generateInsights(txs, emptyDebts, goals, emptyWishlist, settings, today);
      const accelInsight = insights.find((ins) => ins.id === "savings-acceleration");
      expect(accelInsight).toBeDefined();
    });

    it("triggers spending-pace warning when average exceeds safe budget", () => {
      // 1.5M monthly budget -> 50k safe limit per day.
      // Average 100k spending daily.
      const txs = Array.from({ length: 7 }, (_, i) =>
        makeTx({ amount: 100_000, date: `2026-06-${String(14 + i).padStart(2, "0")}` })
      );
      const insights = generateInsights(txs, emptyDebts, emptyGoals, emptyWishlist, settings, today);
      const warning = insights.find((ins) => ins.id === "spending-pace-warning");
      expect(warning).toBeDefined();
    });

    it("triggers frugal-streak when below budget days >= 4", () => {
      const txs = [
        makeTx({ amount: 5_000, date: "2026-06-20" }),
        makeTx({ amount: 5_000, date: "2026-06-19" }),
        makeTx({ amount: 5_000, date: "2026-06-18" }),
        makeTx({ amount: 5_000, date: "2026-06-17" }),
      ];
      const insights = generateInsights(txs, emptyDebts, emptyGoals, emptyWishlist, settings, today);
      const streak = insights.find((ins) => ins.id === "frugal-streak");
      expect(streak).toBeDefined();
    });

    it("triggers savings-ratio low/high alerts correctly", () => {
      const lowSavingsGoal: SavingsGoal[] = [
        {
          id: "g1",
          name: "Grad",
          type: "graduation",
          targetAmount: 1000,
          currentAmount: 0,
          monthlyContribution: 50_000, // 50k of 1.5M = ~3%
          milestonesReached: [],
        },
      ];
      const insights = generateInsights([], emptyDebts, lowSavingsGoal, emptyWishlist, settings, today);
      const ratioLow = insights.find((ins) => ins.id === "savings-ratio-low");
      expect(ratioLow).toBeDefined();

      const highSavingsGoal: SavingsGoal[] = [
        {
          id: "g1",
          name: "Grad",
          type: "graduation",
          targetAmount: 1000,
          currentAmount: 0,
          monthlyContribution: 400_000, // 400k of 1.5M = ~27%
          milestonesReached: [],
        },
      ];
      const insightsHigh = generateInsights([], emptyDebts, highSavingsGoal, emptyWishlist, settings, today);
      const ratioHigh = insightsHigh.find((ins) => ins.id === "savings-ratio");
      expect(ratioHigh).toBeDefined();
    });
  });
});
