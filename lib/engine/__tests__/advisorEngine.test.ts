// lib/engine/__tests__/advisorEngine.test.ts
// ---------------------------------------------------------------------------
// Unit test resmi Vitest untuk modul Advisor Engine (Compass Finance).
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  getMonthComparison,
  getSavingsForecasts,
  getGoalForecasts,
  getDebtForecasts,
  getOverspendingAlerts,
  getMerchantAnalysis,
  getRecommendations,
} from "../advisorEngine";
import type { Transaction, SavingsGoal, Debt } from "../../types";

// Helper generator data transaksi mockup
function makeTx(overrides: Partial<Transaction> & Pick<Transaction, "amount" | "kind" | "date">): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2, 8)}`,
    category: "food",
    source: "manual",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const TODAY = new Date("2026-06-20");

// Fixtures: Data Transaksi riil (Section 3 blueprint v10)
const transactions: Transaction[] = [
  // June 2026
  makeTx({ amount: 15000, kind: "expense", date: "2026-06-20", category: "food", merchant: "Warteg" }),
  makeTx({ amount: 50000, kind: "expense", date: "2026-06-15", category: "food", merchant: "KFC" }),
  makeTx({ amount: 30000, kind: "expense", date: "2026-06-10", category: "transport" }),
  makeTx({ amount: 80000, kind: "expense", date: "2026-06-05", category: "shopping" }),
  makeTx({ amount: 1500000, kind: "income", date: "2026-06-01" }),
  // May 2026
  makeTx({ amount: 25000, kind: "expense", date: "2026-05-20", category: "food", merchant: "Warteg" }),
  makeTx({ amount: 20000, kind: "expense", date: "2026-05-15", category: "transport" }),
  makeTx({ amount: 40000, kind: "expense", date: "2026-05-10", category: "shopping" }),
  makeTx({ amount: 1500000, kind: "income", date: "2026-05-01" }),
  // April 2026
  makeTx({ amount: 30000, kind: "expense", date: "2026-04-20", category: "food", merchant: "Warteg" }),
  makeTx({ amount: 15000, kind: "expense", date: "2026-04-15", category: "transport" }),
  makeTx({ amount: 35000, kind: "expense", date: "2026-04-10", category: "shopping" }),
  makeTx({ amount: 1500000, kind: "income", date: "2026-04-01" }),
  // March 2026
  makeTx({ amount: 20000, kind: "expense", date: "2026-03-20", category: "food" }),
  makeTx({ amount: 1500000, kind: "income", date: "2026-03-01" }),
];

const goals: SavingsGoal[] = [
  {
    id: "goal-1",
    name: "Graduation Fund",
    type: "graduation",
    targetAmount: 40000000,
    currentAmount: 3500000,
    targetDate: "2029-09-01",
    monthlyContribution: 600000,
    createdAt: "2026-01-01",
    milestonesReached: [],
  },
  {
    id: "goal-2",
    name: "Emergency Fund",
    type: "emergency",
    targetAmount: 10000000,
    currentAmount: 7500000,
    monthlyContribution: 200000,
    createdAt: "2026-01-01",
    milestonesReached: [],
  },
];

const debts: Debt[] = [
  {
    id: "debt-1",
    name: "SPayLater",
    installments: [
      { id: "spl-06", dueDate: "2026-06-25", amount: 181801, isPaid: false },
      { id: "spl-07", dueDate: "2026-07-25", amount: 597016, isPaid: false },
      { id: "spl-08", dueDate: "2026-08-25", amount: 419896, isPaid: false },
    ],
  },
  {
    id: "debt-2",
    name: "GoPay Pinjam",
    installments: [
      { id: "gpp-07", dueDate: "2026-07-25", amount: 396283, isPaid: false },
      { id: "gpp-08", dueDate: "2026-08-25", amount: 479553, isPaid: false },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main Test Suite
// ---------------------------------------------------------------------------
describe("Advisor Engine Tests", () => {
  
  it("getMonthComparison compares this vs last month", () => {
    const cmp = getMonthComparison(transactions, TODAY);

    expect(cmp.thisMonthTotal).toBeGreaterThan(0);
    expect(cmp.lastMonthTotal).toBeGreaterThan(0);
    expect(typeof cmp.changePercent).toBe("number");
    expect(["up", "down", "same"]).toContain(cmp.direction);

    expect(cmp.thisMonthTotal).toBe(175000);
    expect(cmp.lastMonthTotal).toBe(85000);
    expect(cmp.direction).toBe("up");

    expect(cmp.categoryChanges.length).toBeGreaterThan(0);
    const foodChange = cmp.categoryChanges.find((c) => c.category === "food");
    expect(foodChange).toBeDefined();
    if (foodChange) {
      expect(foodChange.thisMonth).toBe(65000);
      expect(foodChange.lastMonth).toBe(25000);
      expect(foodChange.direction).toBe("up");
    }
    expect(cmp.merchantChanges.length).toBeGreaterThan(0);
  });

  it("getMonthComparison with empty transactions", () => {
    const cmp = getMonthComparison([], TODAY);
    expect(cmp.thisMonthTotal).toBe(0);
    expect(cmp.lastMonthTotal).toBe(0);
    expect(cmp.direction).toBe("same");
    expect(cmp.categoryChanges.length).toBe(0);
  });

  it("getSavingsForecasts projects 3/6/12 months", () => {
    const forecasts = getSavingsForecasts(transactions, 700000, TODAY);
    expect(forecasts.length).toBe(3);
    expect(forecasts[0]!.months).toBe(3);
    expect(forecasts[1]!.months).toBe(6);
    expect(forecasts[2]!.months).toBe(12);

    for (const f of forecasts) {
      expect(typeof f.projectedSavings).toBe("number");
      expect(typeof f.projectedBalance).toBe("number");
      expect(f.projectedBalance).toBe(700000 + f.projectedSavings);
    }
    expect(forecasts[2]!.projectedSavings).toBeGreaterThanOrEqual(forecasts[0]!.projectedSavings);
  });

  it("getSavingsForecasts with no history", () => {
    const forecasts = getSavingsForecasts([], 500000, TODAY);
    expect(forecasts.length).toBe(3);
    for (const f of forecasts) {
      expect(f.projectedSavings).toBe(0);
      expect(f.projectedBalance).toBe(500000);
    }
  });

  it("getGoalForecasts predicts completion dates", () => {
    const gf = getGoalForecasts(goals, TODAY);
    expect(gf.length).toBe(2);

    const grad = gf.find((g) => g.goalId === "goal-1");
    expect(grad).toBeDefined();
    if (grad) {
      expect(grad.remaining).toBe(36500000);
      expect(grad.estimatedMonths).toBeGreaterThan(0);
      expect(grad.estimatedMonths).toBe(Math.ceil(36500000 / 600000));
      expect(grad.progressPercent).toBe(9);
      expect(grad.onTrack).toBe(false);
    }

    const emg = gf.find((g) => g.goalId === "goal-2");
    expect(emg).toBeDefined();
    if (emg) {
      expect(emg.remaining).toBe(2500000);
      expect(emg.progressPercent).toBe(75);
    }
  });

  it("getGoalForecasts handles zero contribution", () => {
    const zeroGoals: SavingsGoal[] = [{
      id: "g-zero", name: "No Contribution", type: "custom",
      targetAmount: 1000000, currentAmount: 0,
      monthlyContribution: 0, createdAt: "2026-01-01", milestonesReached: [],
    }];
    const gf = getGoalForecasts(zeroGoals, TODAY);
    expect(gf[0]!.estimatedMonths).toBe(-1);
    expect(gf[0]!.estimatedDate).toBe("Unknown");
  });

  it("getDebtForecasts predicts payoff dates", () => {
    const df = getDebtForecasts(debts, TODAY);
    expect(df.length).toBe(2);

    const spl = df.find((d) => d.debtId === "debt-1");
    expect(spl).toBeDefined();
    if (spl) {
      expect(spl.totalRemaining).toBe(181801 + 597016 + 419896);
      expect(spl.nextPayment).not.toBeNull();
      if (spl.nextPayment) {
        expect(spl.nextPayment.dueDate).toBe("2026-06-25");
        expect(spl.nextPayment.amount).toBe(181801);
      }
      expect(spl.monthsRemaining).toBeGreaterThanOrEqual(0);
    }
  });

  it("getDebtForecasts handles partially paid debt", () => {
    const paidDebts: Debt[] = [{
      id: "d-paid", name: "Almost Done",
      installments: [
        { id: "i1", dueDate: "2026-05-25", amount: 100000, isPaid: true, paidAt: "2026-05-25" },
        { id: "i2", dueDate: "2026-06-25", amount: 100000, isPaid: false },
      ],
    }];
    const df = getDebtForecasts(paidDebts, TODAY);
    expect(df[0]!.totalRemaining).toBe(100000);
  });

  it("getOverspendingAlerts detects category overspending", () => {
    const txs: Transaction[] = [
      makeTx({ amount: 100000, kind: "expense", date: "2026-06-15", category: "food" }),
      makeTx({ amount: 80000, kind: "expense", date: "2026-06-10", category: "food" }),
      makeTx({ amount: 30000, kind: "expense", date: "2026-05-15", category: "food" }),
      makeTx({ amount: 25000, kind: "expense", date: "2026-04-15", category: "food" }),
      makeTx({ amount: 35000, kind: "expense", date: "2026-03-15", category: "food" }),
    ];
    const alerts = getOverspendingAlerts(txs, TODAY, 1.3);
    expect(alerts.length).toBeGreaterThan(0);

    const foodAlert = alerts.find((a) => a.category === "food");
    expect(foodAlert).toBeDefined();
    if (foodAlert) {
      expect(foodAlert.currentSpend).toBe(180000);
      expect(foodAlert.averageSpend).toBeGreaterThan(0);
      expect(foodAlert.overagePercent).toBeGreaterThan(0);
    }
  });

  it("getMerchantAnalysis returns sorted merchants", () => {
    const merchants = getMerchantAnalysis(transactions);
    expect(merchants.length).toBeGreaterThan(0);

    for (let i = 1; i < merchants.length; i++) {
      expect(merchants[i - 1]!.totalSpent).toBeGreaterThanOrEqual(merchants[i]!.totalSpent);
    }

    const warteg = merchants.find((m) => m.name === "Warteg");
    expect(warteg).toBeDefined();
    if (warteg) {
      expect(warteg.transactionCount).toBe(3);
      expect(warteg.totalSpent).toBe(70000);
    }
  });

  it("getRecommendations generates actionable insights", () => {
    const recs = getRecommendations(transactions, 700000, goals, debts, TODAY);
    expect(recs.length).toBeGreaterThan(0);

    for (const rec of recs) {
      expect(rec.id).toBeDefined();
      expect(rec.title).toBeDefined();
      expect(["info", "warning", "critical", "success"]).toContain(rec.severity);
    }
  });

  it("All advisor functions handle empty inputs gracefully", () => {
    const cmp = getMonthComparison([], TODAY);
    expect(cmp.thisMonthTotal).toBe(0);

    const forecasts = getSavingsForecasts([], 0, TODAY);
    expect(forecasts.length).toBe(3);

    const gf = getGoalForecasts([], TODAY);
    expect(gf.length).toBe(0);

    const df = getDebtForecasts([], TODAY);
    expect(df.length).toBe(0);
  });
});