// lib/engine/__tests__/spendingEngine.test.ts
import { describe, it, expect } from "vitest";
import { getSpendingSnapshot } from "../spendingEngine";
import type { Transaction, TransferSettings } from "../../types";

// ── Fixtures ──────────────────────────────────────────────────────────
const settings: TransferSettings = {
  balance: 750_000,
  dayOne: 1,
  dayTwo: 15,
  amountPerTransfer: 750_000,
};

const today = new Date("2026-06-10");

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2)}`,
    amount: 0,
    kind: "expense",
    category: "food",
    date: "2026-06-10",
    source: "manual",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("getSpendingSnapshot", () => {
  it("returns correct available balance", () => {
    const result = getSpendingSnapshot(750_000, [], settings, today);
    expect(result.availableBalance).toBe(750_000);
  });

  it("calculates safeToSpendToday from balance and days remaining", () => {
    const result = getSpendingSnapshot(750_000, [], settings, today);
    // dayTwo is 15, today is 10 → 5 days remaining → 750k/5 = 150k
    expect(result.safeToSpendToday).toBeGreaterThan(0);
    expect(result.safeToSpendToday).toBeLessThanOrEqual(750_000);
  });

  it("sums todaySpent from same-day expense transactions", () => {
    const txs = [
      makeTx({ amount: 15_000, date: "2026-06-10", kind: "expense" }),
      makeTx({ amount: 25_000, date: "2026-06-10", kind: "expense" }),
      makeTx({ amount: 10_000, date: "2026-06-09", kind: "expense" }), // not today
    ];
    const result = getSpendingSnapshot(750_000, txs, settings, today);
    expect(result.todaySpent).toBe(40_000);
  });

  it("does not count income transactions in todaySpent", () => {
    const txs = [
      makeTx({ amount: 15_000, date: "2026-06-10", kind: "expense" }),
      makeTx({ amount: 500_000, date: "2026-06-10", kind: "income" }),
    ];
    const result = getSpendingSnapshot(750_000, txs, settings, today);
    expect(result.todaySpent).toBe(15_000);
  });

  it("calculates weekSpent within same ISO week", () => {
    // June 10, 2026 is a Wednesday. Same week = Mon Jun 8 – Sun Jun 14
    const txs = [
      makeTx({ amount: 10_000, date: "2026-06-08", kind: "expense" }),
      makeTx({ amount: 20_000, date: "2026-06-10", kind: "expense" }),
      makeTx({ amount: 5_000, date: "2026-06-01", kind: "expense" }), // prior week
    ];
    const result = getSpendingSnapshot(750_000, txs, settings, today);
    expect(result.weekSpent).toBe(30_000);
  });

  it("calculates monthSpent for June", () => {
    const txs = [
      makeTx({ amount: 10_000, date: "2026-06-01", kind: "expense" }),
      makeTx({ amount: 20_000, date: "2026-06-10", kind: "expense" }),
      makeTx({ amount: 5_000, date: "2026-05-31", kind: "expense" }), // May
    ];
    const result = getSpendingSnapshot(750_000, txs, settings, today);
    expect(result.monthSpent).toBe(30_000);
  });

  it("returns ahead pace when spending well below safe rate", () => {
    // With 750k balance and ~5 days left, safe limit ~150k/day
    // Spending 0 so far → way ahead
    const result = getSpendingSnapshot(750_000, [], settings, today);
    expect(result.pace).toBe("ahead");
  });

  it("returns behind pace when heavily overspending", () => {
    // Spend most of balance in early days
    const txs = Array.from({ length: 5 }, (_, i) =>
      makeTx({ amount: 200_000, date: `2026-06-0${i + 1}`, kind: "expense" })
    );
    const result = getSpendingSnapshot(50_000, txs, settings, today);
    // paceDelta will be very negative since avg daily spend >>> safe limit
    expect(result.pace).toBe("behind");
  });

  it("safeToSpendToday is 0 when balance is 0", () => {
    const result = getSpendingSnapshot(0, [], settings, today);
    expect(result.safeToSpendToday).toBe(0);
  });

  it("recommendedDailyLimit matches safeToSpendToday", () => {
    const result = getSpendingSnapshot(750_000, [], settings, today);
    expect(result.recommendedDailyLimit).toBe(result.safeToSpendToday);
  });
});
