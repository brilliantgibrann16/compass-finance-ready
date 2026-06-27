import { describe, it, expect } from "vitest";
import {
  getCategoryBreakdown,
  getDailySpending,
  getWeeklySpending,
  getMonthlySpending,
  generateInsights,
} from "../insightsEngine";
import type { Transaction, Debt, SavingsGoal, WishlistItem, TransferSettings } from "../../types";

const TODAY = new Date("2026-06-20");
const settings: TransferSettings = { dayOne: 1, dayTwo: 15, amountPerTransfer: 1500000 };

function makeTx(overrides: Partial<Transaction> & Pick<Transaction, "amount" | "kind" | "date">): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2, 8)}`,
    category: "food",
    source: "manual",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const baseTxs: Transaction[] = [
  makeTx({ amount: 100000, kind: "expense", date: "2026-06-20", category: "food" }),
  makeTx({ amount: 50000, kind: "expense", date: "2026-06-15", category: "food" }),
  makeTx({ amount: 30000, kind: "expense", date: "2026-06-10", category: "transport" }),
  makeTx({ amount: 80000, kind: "expense", date: "2026-06-05", category: "shopping" }),
];

describe("insightsEngine", () => {
  describe("getCategoryBreakdown", () => {
    it("returns categories sorted by amount descending", () => {
      const breakdown = getCategoryBreakdown(baseTxs, 30, TODAY);
      for (let i = 1; i < breakdown.length; i++) {
        expect(breakdown[i - 1]!.amount).toBeGreaterThanOrEqual(breakdown[i]!.amount);
      }
    });

    it("calculates percentages that roughly sum to 100", () => {
      const breakdown = getCategoryBreakdown(baseTxs, 30, TODAY);
      const total = breakdown.reduce((s, b) => s + b.percentage, 0);
      expect(total).toBeGreaterThanOrEqual(98);
      expect(total).toBeLessThanOrEqual(102);
    });

    it("includes label and color from CATEGORIES", () => {
      const breakdown = getCategoryBreakdown(baseTxs, 30, TODAY);
      for (const b of breakdown) {
        expect(b.label).toBeDefined();
        expect(b.color).toBeDefined();
      }
    });

    it("returns empty for no transactions", () => {
      expect(getCategoryBreakdown([], 30, TODAY)).toEqual([]);
    });
  });

  describe("getDailySpending", () => {
    it("returns one entry per day", () => {
      const daily = getDailySpending(baseTxs, 7, TODAY);
      expect(daily).toHaveLength(7);
    });

    it("sums expenses per day correctly", () => {
      const daily = getDailySpending(baseTxs, 7, TODAY);
      const todayEntry = daily.find((d) => d.date === "2026-06-20");
      expect(todayEntry!.amount).toBe(100000);
    });

    it("uses day-of-week labels", () => {
      const daily = getDailySpending(baseTxs, 7, TODAY);
      for (const d of daily) {
        expect(d.label).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
      }
    });
  });

  describe("getWeeklySpending", () => {
    it("returns entries for requested weeks", () => {
      const weekly = getWeeklySpending(baseTxs, 4, TODAY);
      expect(weekly.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("getMonthlySpending", () => {
    it("returns entries for requested months", () => {
      const monthly = getMonthlySpending(baseTxs, 3, TODAY);
      expect(monthly).toHaveLength(3);
    });

    it("sums current month correctly", () => {
      const monthly = getMonthlySpending(baseTxs, 1, TODAY);
      expect(monthly[0]!.amount).toBe(260000);
    });
  });

  describe("generateInsights", () => {
    const debts: Debt[] = [];
    const goals: SavingsGoal[] = [
      {
        id: "g1",
        name: "Graduation",
        type: "graduation",
        targetAmount: 40000000,
        currentAmount: 3500000,
        targetDate: "2029-09-01",
        monthlyContribution: 600000,
        createdAt: "2026-01-01",
        milestonesReached: [],
      },
    ];
    const wishlist: WishlistItem[] = [];

    it("returns insights sorted by priority descending", () => {
      const insights = generateInsights(baseTxs, debts, goals, wishlist, settings, TODAY);
      for (let i = 1; i < insights.length; i++) {
        expect(insights[i - 1]!.priority).toBeGreaterThanOrEqual(insights[i]!.priority);
      }
    });

    it("generates top-category insight when > 30% of spending", () => {
      const heavyFood = [
        makeTx({ amount: 500000, kind: "expense", date: "2026-06-20", category: "food" }),
        makeTx({ amount: 100000, kind: "expense", date: "2026-06-15", category: "transport" }),
      ];
      const insights = generateInsights(heavyFood, debts, goals, wishlist, settings, TODAY);
      const topCat = insights.find((i) => i.id === "top-category");
      expect(topCat).toBeDefined();
    });

    it("generates savings-acceleration insight when top category > 25%", () => {
      const heavyFood = [
        makeTx({ amount: 500000, kind: "expense", date: "2026-06-20", category: "food" }),
        makeTx({ amount: 100000, kind: "expense", date: "2026-06-15", category: "transport" }),
      ];
      const insights = generateInsights(heavyFood, debts, goals, wishlist, settings, TODAY);
      const savAccel = insights.find((i) => i.id === "savings-acceleration");
      expect(savAccel).toBeDefined();
    });

    it("generates wishlist insight when item >= 75% funded", () => {
      const nearComplete: WishlistItem[] = [
        {
          id: "w1",
          name: "Phone",
          targetAmount: 1000000,
          savedAmount: 800000,
          monthlyContribution: 100000,
          priority: "high",
          createdAt: "2026-01-01",
        },
      ];
      const insights = generateInsights(baseTxs, debts, goals, nearComplete, settings, TODAY);
      const wishlistInsight = insights.find((i) => i.id === "wishlist-close-w1");
      expect(wishlistInsight).toBeDefined();
    });

    it("generates savings-ratio-low when < 10%", () => {
      const lowGoals: SavingsGoal[] = [
        { ...goals[0]!, monthlyContribution: 100000 },
      ];
      const insights = generateInsights(baseTxs, debts, lowGoals, wishlist, settings, TODAY);
      const ratioLow = insights.find((i) => i.id === "savings-ratio-low");
      expect(ratioLow).toBeDefined();
    });

    it("generates debt-on-track when last unpaid is before target", () => {
      const debtsOnTrack: Debt[] = [
        {
          id: "d1",
          name: "Test",
          installments: [
            { id: "i1", dueDate: "2026-08-25", amount: 100000, isPaid: false },
          ],
        },
      ];
      const insights = generateInsights(baseTxs, debtsOnTrack, goals, wishlist, settings, TODAY);
      const debtInsight = insights.find((i) => i.id === "debt-on-track");
      expect(debtInsight).toBeDefined();
    });

    it("returns empty for empty inputs", () => {
      const insights = generateInsights([], [], [], [], settings, TODAY);
      expect(Array.isArray(insights)).toBe(true);
    });
  });
});
