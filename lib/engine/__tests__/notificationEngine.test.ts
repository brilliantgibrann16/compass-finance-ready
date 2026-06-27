// lib/engine/__tests__/notificationEngine.test.ts
import { describe, it, expect } from "vitest";
import { generateNotifications } from "../notificationEngine";
import type { AppData } from "../../types";

// ── Fixtures ──────────────────────────────────────────────────────────
const today = new Date("2026-06-20");

function makeAppData(overrides: Partial<AppData> = {}): AppData {
  return {
    balance: 0,
    transactions: [],
    transferSettings: {
      dayOne: 1,
      dayTwo: 15,
      amountPerTransfer: 750_000,
    },
    debts: [],
    savingsGoals: [],
    wishlist: [],
    notifications: [],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("generateNotifications", () => {
  it("returns empty array when no conditions trigger", () => {
    const data = makeAppData();
    const result = generateNotifications(data, today);
    expect(result).toEqual([]);
  });

  it("generates warning when debt payment due in 3 days", () => {
    const data = makeAppData({
      debts: [
        {
          id: "gopay",
          name: "GoPay Pinjam",
          installments: [
            { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-06-23", amount: 500_000, isPaid: false }, // 3 days from Jun 20
          ],
        },
      ],
    });
    const result = generateNotifications(data, today);
    const dueWarning = result.find((n) => n.title === "Payment due in 3 days");
    expect(dueWarning).toBeDefined();
    expect(dueWarning!.type).toBe("warning");
    expect(dueWarning!.href).toBe("/debt");
  });

  it("generates warning when debt payment due tomorrow", () => {
    const data = makeAppData({
      debts: [
        {
          id: "spaylater",
          name: "SPayLater",
          installments: [
            { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-06-21", amount: 300_000, isPaid: false }, // tomorrow
          ],
        },
      ],
    });
    const result = generateNotifications(data, today);
    const dueTomorrow = result.find((n) => n.title === "Payment due tomorrow!");
    expect(dueTomorrow).toBeDefined();
  });

  it("generates warning when debt payment due today", () => {
    const data = makeAppData({
      debts: [
        {
          id: "d1",
          name: "Debt Today",
          installments: [
            { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-06-20", amount: 100_000, isPaid: false },
          ],
        },
      ],
    });
    const result = generateNotifications(data, today);
    const dueToday = result.find((n) => n.title === "Payment due today");
    expect(dueToday).toBeDefined();
  });

  it("generates overdue warning for past-due installments", () => {
    const data = makeAppData({
      debts: [
        {
          id: "d2",
          name: "Overdue Debt",
          installments: [
            { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-06-18", amount: 200_000, isPaid: false }, // 2 days overdue
          ],
        },
      ],
    });
    const result = generateNotifications(data, today);
    const overdue = result.find((n) => n.title === "Overdue payment");
    expect(overdue).toBeDefined();
    expect(overdue!.message).toContain("Overdue Debt");
  });

  it("skips paid installments", () => {
    const data = makeAppData({
      debts: [
        {
          id: "d3",
          name: "Paid Debt",
          installments: [
            { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-06-23", amount: 100_000, isPaid: true },
          ],
        },
      ],
    });
    const result = generateNotifications(data, today);
    const debtNotifs = result.filter((n) => n.href === "/debt");
    expect(debtNotifs).toHaveLength(0);
  });

  it("generates high spending warning when exceeding 80% of budget", () => {
    const data = makeAppData({
      transactions: [
        {
          id: "tx1",
          amount: 1_300_000, // > 80% of 1.5M (2 × 750k)
          kind: "expense",
          category: "shopping",
          date: "2026-06-15",
          source: "manual",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    const result = generateNotifications(data, today);
    const highSpending = result.find((n) => n.title === "High spending this month");
    expect(highSpending).toBeDefined();
    expect(highSpending!.href).toBe("/insights");
  });

  it("generates goal milestone notifications", () => {
    const data = makeAppData({
      savingsGoals: [
        {
          id: "grad",
          name: "Graduation Fund",
          type: "graduation",
          targetAmount: 10_000_000,
          currentAmount: 5_000_000, // 50%
          monthlyContribution: 500_000,
          createdAt: "2026-06-01T00:00:00.000Z",
    milestonesReached: [25], // 50 not yet reached
        },
      ],
    });
    const result = generateNotifications(data, today);
    const milestone = result.find((n) => n.title?.includes("milestone"));
    expect(milestone).toBeDefined();
    expect(milestone!.type).toBe("success");
  });

  it("generates wishlist halfway notification", () => {
    const data = makeAppData({
      wishlist: [
        {
          id: "phone",
          name: "New Phone",
          targetAmount: 4_000_000,
          savedAmount: 2_500_000, monthlyContribution: 0, priority: "medium",  // ~63%
          createdAt: "2026-01-01",
        },
      ],
    });
    const result = generateNotifications(data, today);
    const halfwayNotif = result.find((n) => n.title?.includes("Halfway"));
    expect(halfwayNotif).toBeDefined();
  });

  it("generates wishlist ready-to-buy notification when fully saved", () => {
    const data = makeAppData({
      wishlist: [
        {
          id: "book",
          name: "Textbook",
          targetAmount: 200_000,
          savedAmount: 200_000, monthlyContribution: 0, priority: "medium", 
          createdAt: "2026-01-01",
        },
      ],
    });
    const result = generateNotifications(data, today);
    const buyNotif = result.find((n) => n.title?.includes("can buy"));
    expect(buyNotif).toBeDefined();
    expect(buyNotif!.type).toBe("success");
  });

  it("all notifications have required date and type", () => {
    const data = makeAppData({
      debts: [
        {
          id: "d",
          name: "Test",
          installments: [
            { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-06-23", amount: 100_000, isPaid: false },
          ],
        },
      ],
    });
    const result = generateNotifications(data, today);
    for (const n of result) {
      expect(n.date).toBe("2026-06-20");
      expect(["warning", "success", "reminder"]).toContain(n.type);
    }
  });
});
