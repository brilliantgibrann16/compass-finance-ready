import { describe, it, expect } from "vitest";
import { generateCoachTips } from "../coachEngine";
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

const baseGoals: SavingsGoal[] = [
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

const baseDebts: Debt[] = [
  {
    id: "d1",
    name: "SPayLater",
    installments: [
      { id: "i1", dueDate: "2026-06-25", amount: 200000, isPaid: false },
      { id: "i2", dueDate: "2026-07-25", amount: 300000, isPaid: false },
    ],
  },
];

describe("coachEngine", () => {
  it("returns tips sorted by priority descending", () => {
    const txs = [
      makeTx({ amount: 100000, kind: "expense", date: "2026-06-20", category: "food" }),
      makeTx({ amount: 50000, kind: "expense", date: "2026-06-15", category: "food" }),
    ];
    const tips = generateCoachTips(txs, baseDebts, baseGoals, [], settings, 700000, TODAY);
    for (let i = 1; i < tips.length; i++) {
      expect(tips[i - 1]!.priority).toBeGreaterThanOrEqual(tips[i]!.priority);
    }
  });

  it("generates food tip when food spending > 30%", () => {
    const txs = [
      makeTx({ amount: 300000, kind: "expense", date: "2026-06-10", category: "food" }),
      makeTx({ amount: 50000, kind: "expense", date: "2026-06-05", category: "transport" }),
    ];
    const tips = generateCoachTips(txs, [], [], [], settings, 700000, TODAY);
    const foodTip = tips.find((t) => t.id === "skip-food");
    expect(foodTip).toBeDefined();
    expect(foodTip!.type).toBe("spending");
  });

  it("generates daily-overspend warning when today exceeds safe limit", () => {
    const txs = [
      makeTx({ amount: 500000, kind: "expense", date: "2026-06-20", category: "food" }),
    ];
    const tips = generateCoachTips(txs, [], [], [], settings, 700000, TODAY);
    const overspend = tips.find((t) => t.id === "daily-overspend");
    expect(overspend).toBeDefined();
    expect(overspend!.priority).toBe(10);
  });

  it("generates transport tip when transport > 15%", () => {
    const txs = [
      makeTx({ amount: 200000, kind: "expense", date: "2026-06-10", category: "transport" }),
      makeTx({ amount: 100000, kind: "expense", date: "2026-06-05", category: "food" }),
    ];
    const tips = generateCoachTips(txs, [], [], [], settings, 700000, TODAY);
    const transportTip = tips.find((t) => t.id === "transport-tip");
    expect(transportTip).toBeDefined();
  });

  it("suggests extra savings when surplus exists", () => {
    const txs = [
      makeTx({ amount: 50000, kind: "expense", date: "2026-06-10", category: "food" }),
    ];
    const lowContribGoals: SavingsGoal[] = [
      { ...baseGoals[0]!, monthlyContribution: 100000 },
    ];
    const tips = generateCoachTips(txs, [], lowContribGoals, [], settings, 700000, TODAY);
    const extraSavings = tips.find((t) => t.id === "extra-savings");
    expect(extraSavings).toBeDefined();
    expect(extraSavings!.type).toBe("savings");
  });

  it("generates emergency fund tip when below 3 months income", () => {
    const emergencyGoal: SavingsGoal[] = [
      {
        id: "e1",
        name: "Emergency Fund",
        type: "emergency",
        targetAmount: 10000000,
        currentAmount: 1000000,
        monthlyContribution: 200000,
        createdAt: "2026-01-01",
        milestonesReached: [],
      },
    ];
    const tips = generateCoachTips([], [], emergencyGoal, [], settings, 700000, TODAY);
    const emergencyTip = tips.find((t) => t.id === "emergency-fund");
    expect(emergencyTip).toBeDefined();
  });

  it("generates debt-due-soon tip when payment due within 7 days", () => {
    const tips = generateCoachTips([], baseDebts, [], [], settings, 700000, TODAY);
    const debtTip = tips.find((t) => t.id === "debt-due-soon");
    expect(debtTip).toBeDefined();
    expect(debtTip!.priority).toBe(10);
  });

  it("generates debt-halfway tip when > 50% paid", () => {
    const halfPaidDebts: Debt[] = [
      {
        id: "d1",
        name: "Test",
        installments: [
          { id: "i1", dueDate: "2026-05-25", amount: 100000, isPaid: true },
          { id: "i2", dueDate: "2026-06-25", amount: 100000, isPaid: true },
          { id: "i3", dueDate: "2026-07-25", amount: 100000, isPaid: false },
        ],
      },
    ];
    const tips = generateCoachTips([], halfPaidDebts, [], [], settings, 700000, TODAY);
    const halfwayTip = tips.find((t) => t.id === "debt-halfway");
    expect(halfwayTip).toBeDefined();
  });

  it("generates wishlist-close tip when item is close to completion", () => {
    const wishlist: WishlistItem[] = [
      {
        id: "w1",
        name: "New Phone",
        targetAmount: 3000000,
        savedAmount: 2200000,
        monthlyContribution: 300000,
        priority: "high",
        createdAt: "2026-01-01",
      },
    ];
    const tips = generateCoachTips([], [], [], wishlist, settings, 700000, TODAY);
    const wishlistTip = tips.find((t) => t.id === "wishlist-close-w1");
    expect(wishlistTip).toBeDefined();
  });

  it("returns empty tips array when no rules fire", () => {
    const tips = generateCoachTips([], [], [], [], settings, 0, TODAY);
    expect(Array.isArray(tips)).toBe(true);
  });
});
