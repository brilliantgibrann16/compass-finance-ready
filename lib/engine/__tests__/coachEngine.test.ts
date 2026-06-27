// lib/engine/__tests__/coachEngine.test.ts
import { describe, it, expect } from "vitest";
import { generateCoachTips } from "../coachEngine";
import type { Transaction, Debt, SavingsGoal, WishlistItem, TransferSettings } from "../../types";

// ── Fixtures ──────────────────────────────────────────────────────────
const today = new Date("2026-06-20");

const settings: TransferSettings = {
  dayOne: 1,
  dayTwo: 15,
  amountPerTransfer: 750_000,
};

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2)}`,
    amount: 0,
    kind: "expense",
    category: "food",
    date: "2026-06-15",
    source: "manual",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const baseDebts: Debt[] = [
  {
    id: "gopay",
    name: "GoPay Pinjam",
    installments: [
      { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-06-25", amount: 500_000, isPaid: false },
      { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-07-25", amount: 500_000, isPaid: false },
    ],
  },
];

const baseGoals: SavingsGoal[] = [
  {
    id: "emergency",
    name: "Emergency Fund",
    type: "emergency",
    targetAmount: 5_000_000,
    currentAmount: 500_000,
    monthlyContribution: 200_000,
    createdAt: "2026-06-01T00:00:00.000Z",
    milestonesReached: [],
  },
];

// ── Tests ─────────────────────────────────────────────────────────────

describe("generateCoachTips", () => {
  it("returns an array of tips sorted by priority descending", () => {
    const txs = Array.from({ length: 10 }, (_, i) =>
      makeTx({ amount: 50_000, date: `2026-06-${String(i + 1).padStart(2, "0")}`, category: "food" })
    );
    const tips = generateCoachTips(txs, baseDebts, baseGoals, [], settings, 750_000, today);
    expect(Array.isArray(tips)).toBe(true);
    // Should be sorted by priority desc
    for (let i = 1; i < tips.length; i++) {
      expect(tips[i - 1].priority).toBeGreaterThanOrEqual(tips[i].priority);
    }
  });

  it("triggers food tip when food spending exceeds 30%", () => {
    const txs = Array.from({ length: 15 }, (_, i) =>
      makeTx({ amount: 30_000, date: `2026-06-${String(i + 1).padStart(2, "0")}`, category: "food" })
    );
    const tips = generateCoachTips(txs, [], [], [], settings, 750_000, today);
    const foodTip = tips.find((t) => t.id === "skip-food");
    expect(foodTip).toBeDefined();
    expect(foodTip!.type).toBe("spending");
  });

  it("triggers transport tip when transport exceeds 15%", () => {
    const txs = [
      ...Array.from({ length: 5 }, (_, i) =>
        makeTx({ amount: 30_000, date: `2026-06-${String(i + 1).padStart(2, "0")}`, category: "transport" })
      ),
      makeTx({ amount: 10_000, date: "2026-06-01", category: "food" }),
    ];
    const tips = generateCoachTips(txs, [], [], [], settings, 750_000, today);
    const transportTip = tips.find((t) => t.id === "transport-tip");
    expect(transportTip).toBeDefined();
  });

  it("triggers debt-due-soon when payment is within 7 days", () => {
    // Today is June 20, debt due June 25 → 5 days
    const tips = generateCoachTips([], baseDebts, [], [], settings, 750_000, today);
    const debtTip = tips.find((t) => t.id === "debt-due-soon");
    expect(debtTip).toBeDefined();
    expect(debtTip!.priority).toBe(10);
  });

  it("triggers debt-halfway when progress >= 50%", () => {
    const halfPaidDebts: Debt[] = [
      {
        ...baseDebts[0],
        installments: [
          { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-06-25", amount: 500_000, isPaid: true },
          { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-07-25", amount: 500_000, isPaid: false },
        ],
      },
    ];
    const tips = generateCoachTips([], halfPaidDebts, [], [], settings, 750_000, today);
    const halfwayTip = tips.find((t) => t.id === "debt-halfway");
    expect(halfwayTip).toBeDefined();
  });

  it("triggers emergency fund tip when below 3 months income", () => {
    const tips = generateCoachTips([], [], baseGoals, [], settings, 750_000, today);
    const emergencyTip = tips.find((t) => t.id === "emergency-fund");
    expect(emergencyTip).toBeDefined();
    expect(emergencyTip!.type).toBe("savings");
  });

  it("triggers wishlist-close when close to goal", () => {
    const wishlist: WishlistItem[] = [
      {
        id: "headphones",
        name: "Headphones",
        targetAmount: 500_000,
        savedAmount: 400_000, monthlyContribution: 0, priority: "medium", 
        createdAt: "2026-06-01",
      },
    ];
    const tips = generateCoachTips([], [], [], wishlist, settings, 750_000, today);
    const wishlistTip = tips.find((t) => t.id === "wishlist-close-headphones");
    expect(wishlistTip).toBeDefined();
  });

  it("returns empty array when no rules trigger", () => {
    const tips = generateCoachTips([], [], [], [], settings, 0, today);
    expect(Array.isArray(tips)).toBe(true);
  });

  it("all tips have required fields", () => {
    const txs = Array.from({ length: 10 }, (_, i) =>
      makeTx({ amount: 50_000, date: `2026-06-${String(i + 1).padStart(2, "0")}`, category: "food" })
    );
    const tips = generateCoachTips(txs, baseDebts, baseGoals, [], settings, 750_000, today);
    for (const tip of tips) {
      expect(tip).toHaveProperty("id");
      expect(tip).toHaveProperty("message");
      expect(tip).toHaveProperty("type");
      expect(tip).toHaveProperty("priority");
      expect(tip).toHaveProperty("icon");
    }
  });

  it("tip types are valid CoachTipType values", () => {
    const txs = Array.from({ length: 10 }, (_, i) =>
      makeTx({ amount: 50_000, date: `2026-06-${String(i + 1).padStart(2, "0")}`, category: "food" })
    );
    const tips = generateCoachTips(txs, baseDebts, baseGoals, [], settings, 750_000, today);
    const validTypes = ["spending", "savings", "debt", "goal"];
    for (const tip of tips) {
      expect(validTypes).toContain(tip.type);
    }
  });
});
