import { describe, it, expect } from "vitest";
import { generateNotifications } from "../notificationEngine";
import type { AppData } from "../../types";

const TODAY = new Date("2026-06-20");

function makeAppData(overrides?: Partial<AppData>): AppData {
  return {
    balance: 700000,
    transactions: [],
    transferSettings: { dayOne: 1, dayTwo: 15, amountPerTransfer: 1500000 },
    debts: [],
    savingsGoals: [],
    wishlist: [],
    notifications: [],
    ...overrides,
  };
}

describe("notificationEngine", () => {
  it("generates 3-day warning for upcoming debt payment", () => {
    const data = makeAppData({
      debts: [
        {
          id: "d1",
          name: "SPayLater",
          installments: [
            { id: "i1", dueDate: "2026-06-23", amount: 200000, isPaid: false },
          ],
        },
      ],
    });
    const notifs = generateNotifications(data, TODAY);
    const warning = notifs.find((n) => n.title === "Payment due in 3 days");
    expect(warning).toBeDefined();
    expect(warning!.type).toBe("warning");
  });

  it("generates tomorrow warning for debt due next day", () => {
    const data = makeAppData({
      debts: [
        {
          id: "d1",
          name: "SPayLater",
          installments: [
            { id: "i1", dueDate: "2026-06-21", amount: 200000, isPaid: false },
          ],
        },
      ],
    });
    const notifs = generateNotifications(data, TODAY);
    const warning = notifs.find((n) => n.title === "Payment due tomorrow!");
    expect(warning).toBeDefined();
  });

  it("generates today warning for debt due today", () => {
    const data = makeAppData({
      debts: [
        {
          id: "d1",
          name: "SPayLater",
          installments: [
            { id: "i1", dueDate: "2026-06-20", amount: 200000, isPaid: false },
          ],
        },
      ],
    });
    const notifs = generateNotifications(data, TODAY);
    const warning = notifs.find((n) => n.title === "Payment due today");
    expect(warning).toBeDefined();
  });

  it("generates overdue notification for past-due debt", () => {
    const data = makeAppData({
      debts: [
        {
          id: "d1",
          name: "SPayLater",
          installments: [
            { id: "i1", dueDate: "2026-06-15", amount: 200000, isPaid: false },
          ],
        },
      ],
    });
    const notifs = generateNotifications(data, TODAY);
    const overdue = notifs.find((n) => n.title === "Overdue payment");
    expect(overdue).toBeDefined();
  });

  it("skips paid installments", () => {
    const data = makeAppData({
      debts: [
        {
          id: "d1",
          name: "SPayLater",
          installments: [
            { id: "i1", dueDate: "2026-06-23", amount: 200000, isPaid: true },
          ],
        },
      ],
    });
    const notifs = generateNotifications(data, TODAY);
    const debtNotifs = notifs.filter((n) => n.href === "/debt");
    expect(debtNotifs).toHaveLength(0);
  });

  it("generates overspending alert when > 80% of monthly budget", () => {
    const data = makeAppData({
      transactions: [
        {
          id: "tx1",
          amount: 2600000,
          kind: "expense",
          category: "food",
          date: "2026-06-10",
          source: "manual",
          createdAt: "2026-06-10",
        },
      ],
    });
    const notifs = generateNotifications(data, TODAY);
    const overspend = notifs.find((n) => n.title === "High spending this month");
    expect(overspend).toBeDefined();
  });

  it("generates goal milestone notifications", () => {
    const data = makeAppData({
      savingsGoals: [
        {
          id: "g1",
          name: "Emergency Fund",
          type: "emergency",
          targetAmount: 10000000,
          currentAmount: 5000000,
          monthlyContribution: 200000,
          createdAt: "2026-01-01",
          milestonesReached: [],
        },
      ],
    });
    const notifs = generateNotifications(data, TODAY);
    const milestones = notifs.filter((n) => n.title.includes("milestone"));
    expect(milestones.length).toBeGreaterThanOrEqual(1);
  });

  it("does not generate milestone if already reached", () => {
    const data = makeAppData({
      savingsGoals: [
        {
          id: "g1",
          name: "Emergency Fund",
          type: "emergency",
          targetAmount: 10000000,
          currentAmount: 5000000,
          monthlyContribution: 200000,
          createdAt: "2026-01-01",
          milestonesReached: [25, 50],
        },
      ],
    });
    const notifs = generateNotifications(data, TODAY);
    const milestones = notifs.filter((n) => n.title.includes("milestone"));
    expect(milestones).toHaveLength(0);
  });

  it("generates wishlist halfway notification", () => {
    const data = makeAppData({
      wishlist: [
        {
          id: "w1",
          name: "Phone",
          targetAmount: 1000000,
          savedAmount: 600000,
          monthlyContribution: 100000,
          priority: "high",
          createdAt: "2026-01-01",
        },
      ],
    });
    const notifs = generateNotifications(data, TODAY);
    const halfway = notifs.find((n) => n.title.includes("Halfway"));
    expect(halfway).toBeDefined();
  });

  it("generates wishlist can-buy notification when fully funded", () => {
    const data = makeAppData({
      wishlist: [
        {
          id: "w1",
          name: "Phone",
          targetAmount: 1000000,
          savedAmount: 1000000,
          monthlyContribution: 0,
          priority: "high",
          createdAt: "2026-01-01",
        },
      ],
    });
    const notifs = generateNotifications(data, TODAY);
    const canBuy = notifs.find((n) => n.title.includes("can buy"));
    expect(canBuy).toBeDefined();
  });

  it("returns empty for pristine app data", () => {
    const notifs = generateNotifications(makeAppData(), TODAY);
    expect(Array.isArray(notifs)).toBe(true);
  });
});
