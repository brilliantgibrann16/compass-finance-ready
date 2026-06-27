import { describe, it, expect } from "vitest";
import { getSpendingSnapshot } from "../spendingEngine";
import type { Transaction, TransferSettings } from "../../types";

const settings: TransferSettings = { dayOne: 1, dayTwo: 15, amountPerTransfer: 1500000 };
const TODAY = new Date("2026-06-10");

function makeTx(overrides: Partial<Transaction> & Pick<Transaction, "amount" | "kind" | "date">): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2, 8)}`,
    category: "food",
    source: "manual",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("spendingEngine", () => {
  it("computes todaySpent from same-day expenses", () => {
    const txs: Transaction[] = [
      makeTx({ amount: 15000, kind: "expense", date: "2026-06-10" }),
      makeTx({ amount: 25000, kind: "expense", date: "2026-06-10" }),
      makeTx({ amount: 50000, kind: "expense", date: "2026-06-09" }),
    ];
    const snap = getSpendingSnapshot(700000, txs, settings, TODAY);
    expect(snap.todaySpent).toBe(40000);
  });

  it("excludes income from todaySpent", () => {
    const txs: Transaction[] = [
      makeTx({ amount: 15000, kind: "expense", date: "2026-06-10" }),
      makeTx({ amount: 1500000, kind: "income", date: "2026-06-10" }),
    ];
    const snap = getSpendingSnapshot(700000, txs, settings, TODAY);
    expect(snap.todaySpent).toBe(15000);
  });

  it("computes weekSpent for the current week", () => {
    const txs: Transaction[] = [
      makeTx({ amount: 10000, kind: "expense", date: "2026-06-08" }), // Mon
      makeTx({ amount: 20000, kind: "expense", date: "2026-06-09" }), // Tue
      makeTx({ amount: 15000, kind: "expense", date: "2026-06-10" }), // Wed (today)
      makeTx({ amount: 50000, kind: "expense", date: "2026-06-01" }), // prev week
    ];
    const snap = getSpendingSnapshot(700000, txs, settings, TODAY);
    expect(snap.weekSpent).toBe(45000);
  });

  it("computes monthSpent for the current month", () => {
    const txs: Transaction[] = [
      makeTx({ amount: 10000, kind: "expense", date: "2026-06-01" }),
      makeTx({ amount: 20000, kind: "expense", date: "2026-06-10" }),
      makeTx({ amount: 50000, kind: "expense", date: "2026-05-31" }), // prev month
    ];
    const snap = getSpendingSnapshot(700000, txs, settings, TODAY);
    expect(snap.monthSpent).toBe(30000);
  });

  it("calculates safeToSpendToday from balance / daysRemaining", () => {
    const snap = getSpendingSnapshot(500000, [], settings, TODAY);
    expect(snap.safeToSpendToday).toBeGreaterThan(0);
    expect(snap.recommendedDailyLimit).toBe(snap.safeToSpendToday);
  });

  it("returns availableBalance matching input balance", () => {
    const snap = getSpendingSnapshot(700000, [], settings, TODAY);
    expect(snap.availableBalance).toBe(700000);
  });

  it("determines pace based on delta", () => {
    // No spending, should be ahead
    const snap = getSpendingSnapshot(700000, [], settings, TODAY);
    expect(snap.pace).toBe("ahead");
  });

  it("detects behind pace when overspending", () => {
    const heavyTxs: Transaction[] = Array.from({ length: 10 }, (_, i) =>
      makeTx({ amount: 200000, kind: "expense", date: `2026-06-${String(i + 1).padStart(2, "0")}` })
    );
    const snap = getSpendingSnapshot(100000, heavyTxs, settings, TODAY);
    expect(snap.pace).toBe("behind");
  });

  it("returns empty spending data for no transactions", () => {
    const snap = getSpendingSnapshot(1000000, [], settings, TODAY);
    expect(snap.todaySpent).toBe(0);
    expect(snap.weekSpent).toBe(0);
    expect(snap.monthSpent).toBe(0);
  });

  it("safeToSpendToday is at least 0", () => {
    const snap = getSpendingSnapshot(0, [], settings, TODAY);
    expect(snap.safeToSpendToday).toBeGreaterThanOrEqual(0);
  });
});
