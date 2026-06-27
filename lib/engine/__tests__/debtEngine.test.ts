// lib/engine/__tests__/debtEngine.test.ts
import { describe, it, expect } from "vitest";
import {
  getDebtSummary,
  getAllDebtsSummary,
  getDebtFreeCountdown,
  getMonthlyTimeline,
} from "../debtEngine";
import type { Debt } from "../../types";

// ── Fixtures ──────────────────────────────────────────────────────────
function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: "gopay-pinjam",
    name: "GoPay Pinjam",
    provider: "GoPay",
    totalOriginalAmount: 2_000_000,
    installments: [
      { dueDate: "2026-06-25", amount: 500_000, isPaid: true },
      { dueDate: "2026-07-25", amount: 500_000, isPaid: false },
      { dueDate: "2026-08-25", amount: 500_000, isPaid: false },
      { dueDate: "2026-09-25", amount: 500_000, isPaid: false },
    ],
    ...overrides,
  };
}

const fullyPaidDebt: Debt = {
  id: "spaylater",
  name: "SPayLater",
  provider: "Shopee",
  totalOriginalAmount: 600_000,
  installments: [
    { dueDate: "2026-05-15", amount: 300_000, isPaid: true },
    { dueDate: "2026-06-15", amount: 300_000, isPaid: true },
  ],
};

// ── getDebtSummary ────────────────────────────────────────────────────

describe("getDebtSummary", () => {
  it("calculates total amount from installments", () => {
    const result = getDebtSummary(makeDebt());
    expect(result.totalAmount).toBe(2_000_000);
  });

  it("calculates paid amount correctly", () => {
    const result = getDebtSummary(makeDebt());
    expect(result.paidAmount).toBe(500_000);
    expect(result.remainingAmount).toBe(1_500_000);
  });

  it("identifies fully paid debt", () => {
    const result = getDebtSummary(fullyPaidDebt);
    expect(result.isPaidOff).toBe(true);
    expect(result.remainingAmount).toBe(0);
  });

  it("finds the next due installment", () => {
    const result = getDebtSummary(makeDebt());
    expect(result.nextDueInstallment).not.toBeNull();
    expect(result.nextDueInstallment!.dueDate).toBe("2026-07-25");
  });

  it("returns null next due when all paid", () => {
    const result = getDebtSummary(fullyPaidDebt);
    expect(result.nextDueInstallment).toBeNull();
  });
});

// ── getAllDebtsSummary ─────────────────────────────────────────────────

describe("getAllDebtsSummary", () => {
  it("aggregates across multiple debts", () => {
    const debts = [makeDebt(), fullyPaidDebt];
    const result = getAllDebtsSummary(debts);
    expect(result.totalAmount).toBe(2_600_000);
    expect(result.paidAmount).toBe(1_100_000);
  });

  it("calculates progress percentage", () => {
    const result = getAllDebtsSummary([makeDebt()]);
    expect(result.progressPct).toBe(25); // 500k / 2M
  });

  it("returns 100% progress when all paid off", () => {
    const result = getAllDebtsSummary([fullyPaidDebt]);
    expect(result.progressPct).toBe(100);
    expect(result.isAllPaidOff).toBe(true);
  });

  it("finds earliest next due date across debts", () => {
    const debts = [makeDebt(), fullyPaidDebt];
    const result = getAllDebtsSummary(debts);
    expect(result.nextDueDate).toBe("2026-07-25");
  });

  it("returns null next due when everything is paid", () => {
    const result = getAllDebtsSummary([fullyPaidDebt]);
    expect(result.nextDueDate).toBeNull();
    expect(result.nextDueAmount).toBe(0);
  });

  it("handles empty debts array", () => {
    const result = getAllDebtsSummary([]);
    expect(result.totalAmount).toBe(0);
    expect(result.progressPct).toBe(100);
    expect(result.isAllPaidOff).toBe(true);
  });

  it("tracks lastUnpaidDueDate", () => {
    const result = getAllDebtsSummary([makeDebt()]);
    expect(result.lastUnpaidDueDate).toBe("2026-09-25");
  });
});

// ── getDebtFreeCountdown ──────────────────────────────────────────────

describe("getDebtFreeCountdown", () => {
  it("returns correct days until target", () => {
    const today = new Date("2026-06-20");
    const target = new Date("2027-05-01");
    const result = getDebtFreeCountdown([makeDebt()], today, target);
    expect(result.daysUntilTarget).toBeGreaterThan(300);
    expect(result.targetLabel).toBe("May 2027");
  });

  it("determines on-track when last installment is before target", () => {
    const today = new Date("2026-06-20");
    const target = new Date("2027-05-01"); // well after Sep 2026
    const result = getDebtFreeCountdown([makeDebt()], today, target);
    expect(result.isOnTrack).toBe(true);
  });

  it("determines off-track when target is too soon", () => {
    const today = new Date("2026-06-20");
    const tooSoon = new Date("2026-07-01"); // before last installment Sep
    const result = getDebtFreeCountdown([makeDebt()], today, tooSoon);
    expect(result.isOnTrack).toBe(false);
  });

  it("returns null isOnTrack when all paid off", () => {
    const today = new Date("2026-06-20");
    const result = getDebtFreeCountdown([fullyPaidDebt], today);
    expect(result.isOnTrack).toBeNull();
  });
});

// ── getMonthlyTimeline ────────────────────────────────────────────────

describe("getMonthlyTimeline", () => {
  it("groups installments by month in chronological order", () => {
    const timeline = getMonthlyTimeline([makeDebt()]);
    expect(timeline.length).toBeGreaterThanOrEqual(4);
    expect(timeline[0].monthKey).toBe("2026-06");
  });

  it("marks months fully paid when all installments in that month are paid", () => {
    const timeline = getMonthlyTimeline([fullyPaidDebt]);
    expect(timeline.every((m) => m.isFullyPaid)).toBe(true);
  });

  it("accumulates totals per month across multiple debts", () => {
    const debt2: Debt = {
      ...makeDebt(),
      id: "debt-2",
      name: "Debt 2",
      installments: [
        { dueDate: "2026-07-25", amount: 200_000, isPaid: false },
      ],
    };
    const timeline = getMonthlyTimeline([makeDebt(), debt2]);
    const julyEntry = timeline.find((m) => m.monthKey === "2026-07");
    expect(julyEntry!.monthTotal).toBe(700_000); // 500k + 200k
  });
});
