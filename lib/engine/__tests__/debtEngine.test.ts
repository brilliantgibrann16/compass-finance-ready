import { describe, it, expect } from "vitest";
import {
  getDebtSummary,
  getAllDebtsSummary,
  getDebtFreeCountdown,
  getMonthlyTimeline,
} from "../debtEngine";
import type { Debt } from "../../types";

const makeDebt = (overrides?: Partial<Debt>): Debt => ({
  id: "debt-1",
  name: "SPayLater",
  installments: [
    { id: "i1", dueDate: "2026-06-25", amount: 200000, isPaid: true },
    { id: "i2", dueDate: "2026-07-25", amount: 300000, isPaid: false },
    { id: "i3", dueDate: "2026-08-25", amount: 250000, isPaid: false },
  ],
  ...overrides,
});

describe("debtEngine", () => {
  describe("getDebtSummary", () => {
    it("computes total, paid, remaining amounts", () => {
      const s = getDebtSummary(makeDebt());
      expect(s.totalAmount).toBe(750000);
      expect(s.paidAmount).toBe(200000);
      expect(s.remainingAmount).toBe(550000);
      expect(s.isPaidOff).toBe(false);
    });

    it("finds the next due unpaid installment", () => {
      const s = getDebtSummary(makeDebt());
      expect(s.nextDueInstallment).not.toBeNull();
      expect(s.nextDueInstallment!.dueDate).toBe("2026-07-25");
    });

    it("returns isPaidOff=true when all installments paid", () => {
      const debt = makeDebt({
        installments: [
          { id: "i1", dueDate: "2026-06-25", amount: 100000, isPaid: true },
          { id: "i2", dueDate: "2026-07-25", amount: 100000, isPaid: true },
        ],
      });
      const s = getDebtSummary(debt);
      expect(s.isPaidOff).toBe(true);
      expect(s.remainingAmount).toBe(0);
      expect(s.nextDueInstallment).toBeNull();
    });
  });

  describe("getAllDebtsSummary", () => {
    it("aggregates across multiple debts", () => {
      const debts: Debt[] = [
        makeDebt(),
        makeDebt({
          id: "debt-2",
          name: "GoPay",
          installments: [
            { id: "g1", dueDate: "2026-07-15", amount: 400000, isPaid: false },
          ],
        }),
      ];
      const s = getAllDebtsSummary(debts);
      expect(s.totalAmount).toBe(1150000);
      expect(s.paidAmount).toBe(200000);
      expect(s.isAllPaidOff).toBe(false);
      expect(s.progressPct).toBe(Math.round((200000 / 1150000) * 100));
    });

    it("returns nextDueDate as earliest unpaid due date", () => {
      const debts: Debt[] = [
        makeDebt(),
        makeDebt({
          id: "debt-2",
          name: "GoPay",
          installments: [
            { id: "g1", dueDate: "2026-06-20", amount: 100000, isPaid: false },
          ],
        }),
      ];
      const s = getAllDebtsSummary(debts);
      expect(s.nextDueDate).toBe("2026-06-20");
    });

    it("returns 100% progress for empty debts", () => {
      const s = getAllDebtsSummary([]);
      expect(s.progressPct).toBe(100);
      expect(s.isAllPaidOff).toBe(true);
    });

    it("tracks lastUnpaidDueDate", () => {
      const s = getAllDebtsSummary([makeDebt()]);
      expect(s.lastUnpaidDueDate).toBe("2026-08-25");
    });
  });

  describe("getDebtFreeCountdown", () => {
    const today = new Date("2026-06-20");
    const target = new Date("2027-05-01");

    it("computes days and months until target", () => {
      const countdown = getDebtFreeCountdown([makeDebt()], today, target);
      expect(countdown.daysUntilTarget).toBeGreaterThan(0);
      expect(countdown.monthsUntilTarget).toBeGreaterThan(0);
      expect(countdown.targetLabel).toBe("May 2027");
    });

    it("determines on-track status from last unpaid installment", () => {
      const countdown = getDebtFreeCountdown([makeDebt()], today, target);
      expect(countdown.isOnTrack).toBe(true);
      expect(countdown.actualProjectedLabel).toBe("Aug 2026");
    });

    it("returns null isOnTrack when all debts are paid", () => {
      const paidDebt = makeDebt({
        installments: [
          { id: "i1", dueDate: "2026-06-25", amount: 100000, isPaid: true },
        ],
      });
      const countdown = getDebtFreeCountdown([paidDebt], today, target);
      expect(countdown.isOnTrack).toBeNull();
      expect(countdown.actualProjectedLabel).toBeNull();
    });

    it("detects off-track when last installment is after target", () => {
      const lateDebt = makeDebt({
        installments: [
          { id: "i1", dueDate: "2028-01-25", amount: 500000, isPaid: false },
        ],
      });
      const countdown = getDebtFreeCountdown([lateDebt], today, target);
      expect(countdown.isOnTrack).toBe(false);
    });
  });

  describe("getMonthlyTimeline", () => {
    it("groups installments by month", () => {
      const timeline = getMonthlyTimeline([makeDebt()]);
      expect(timeline.length).toBe(3);
      expect(timeline[0]!.monthKey).toBe("2026-06");
      expect(timeline[0]!.monthTotal).toBe(200000);
    });

    it("marks month as fully paid when all entries are paid", () => {
      const timeline = getMonthlyTimeline([makeDebt()]);
      expect(timeline[0]!.isFullyPaid).toBe(true); // June: only paid installment
      expect(timeline[1]!.isFullyPaid).toBe(false); // July: unpaid
    });

    it("sorts months chronologically", () => {
      const timeline = getMonthlyTimeline([makeDebt()]);
      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i]!.monthKey > timeline[i - 1]!.monthKey).toBe(true);
      }
    });

    it("aggregates across multiple debts in the same month", () => {
      const debts: Debt[] = [
        makeDebt(),
        makeDebt({
          id: "debt-2",
          name: "GoPay",
          installments: [
            { id: "g1", dueDate: "2026-07-15", amount: 400000, isPaid: false },
          ],
        }),
      ];
      const timeline = getMonthlyTimeline(debts);
      const july = timeline.find((m) => m.monthKey === "2026-07");
      expect(july).toBeDefined();
      expect(july!.monthTotal).toBe(700000);
      expect(july!.entries).toHaveLength(2);
    });

    it("returns empty array for no debts", () => {
      expect(getMonthlyTimeline([])).toEqual([]);
    });
  });
});
