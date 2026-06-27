import { describe, it, expect } from "vitest";
import { getHealthScore } from "../healthScore";
import type { Debt, SavingsGoal } from "../../types";

const makeDebt = (paid: boolean[], amount = 100000): Debt => ({
  id: "d1",
  name: "Test Debt",
  installments: paid.map((isPaid, i) => ({
    id: `inst-${i}`,
    dueDate: `2026-0${i + 1}-25`,
    amount,
    isPaid,
  })),
});

const makeGoal = (current: number, target: number): SavingsGoal => ({
  id: "g1",
  name: "Test Goal",
  type: "custom",
  targetAmount: target,
  currentAmount: current,
  monthlyContribution: 100000,
  createdAt: "2026-01-01",
  milestonesReached: [],
});

describe("healthScore", () => {
  it("returns max score when ahead, no debt, full savings, positive buffer", () => {
    const result = getHealthScore("ahead", [], [makeGoal(100, 100)], 0.3, 0.8);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.band).toBe("green");
    expect(result.breakdown).toHaveLength(4);
  });

  it("returns lower score when behind pace", () => {
    const behind = getHealthScore("behind", [], [], 0.5, 0.5);
    const ahead = getHealthScore("ahead", [], [], 0.5, 0.5);
    expect(behind.score).toBeLessThan(ahead.score);
  });

  it("on-track pace gives 18 points", () => {
    const result = getHealthScore("on-track", [], [], 0.5, 0.5);
    const paceBreakdown = result.breakdown.find((b) => b.label === "Spending pace");
    expect(paceBreakdown!.points).toBe(18);
  });

  it("scores debt trajectory based on paid ratio", () => {
    const halfPaid = getHealthScore("on-track", [makeDebt([true, false])], [], 0.5, 0.5);
    const noPaid = getHealthScore("on-track", [makeDebt([false, false])], [], 0.5, 0.5);
    const debtHalf = halfPaid.breakdown.find((b) => b.label === "Debt trajectory");
    const debtNone = noPaid.breakdown.find((b) => b.label === "Debt trajectory");
    expect(debtHalf!.points).toBeGreaterThan(debtNone!.points);
  });

  it("gives full 25 points for debt when all debts are paid", () => {
    const allPaid = getHealthScore("on-track", [makeDebt([true, true])], [], 0.5, 0.5);
    const debtBreakdown = allPaid.breakdown.find((b) => b.label === "Debt trajectory");
    expect(debtBreakdown!.points).toBe(25);
  });

  it("gives 12 points for savings when no goals set", () => {
    const result = getHealthScore("on-track", [], [], 0.5, 0.5);
    const savingsBreakdown = result.breakdown.find((b) => b.label === "Savings progress");
    expect(savingsBreakdown!.points).toBe(12);
  });

  it("scores savings based on progress toward goals", () => {
    const full = getHealthScore("on-track", [], [makeGoal(500000, 500000)], 0.5, 0.5);
    const partial = getHealthScore("on-track", [], [makeGoal(250000, 500000)], 0.5, 0.5);
    const savFull = full.breakdown.find((b) => b.label === "Savings progress");
    const savPartial = partial.breakdown.find((b) => b.label === "Savings progress");
    expect(savFull!.points).toBeGreaterThan(savPartial!.points);
  });

  it("buffer score rewards having more balance remaining than cycle elapsed", () => {
    const highBuffer = getHealthScore("on-track", [], [], 0.2, 0.8);
    const lowBuffer = getHealthScore("on-track", [], [], 0.8, 0.2);
    const bufHigh = highBuffer.breakdown.find((b) => b.label === "Cycle buffer");
    const bufLow = lowBuffer.breakdown.find((b) => b.label === "Cycle buffer");
    expect(bufHigh!.points).toBeGreaterThan(bufLow!.points);
  });

  it("clamps score between 0 and 100", () => {
    const maxCase = getHealthScore("ahead", [], [makeGoal(1000, 1000)], 0.0, 1.0);
    expect(maxCase.score).toBeLessThanOrEqual(100);
    expect(maxCase.score).toBeGreaterThanOrEqual(0);
  });

  it("assigns correct band thresholds", () => {
    const green = getHealthScore("ahead", [], [makeGoal(1000, 1000)], 0.1, 0.9);
    expect(green.band).toBe("green");

    const red = getHealthScore("behind", [makeDebt([false, false, false, false])], [], 0.9, 0.1);
    expect(red.band).toBe("red");
  });

  it("breakdown always has 4 items with correct maxPoints", () => {
    const result = getHealthScore("on-track", [], [], 0.5, 0.5);
    expect(result.breakdown).toHaveLength(4);
    for (const item of result.breakdown) {
      expect(item.maxPoints).toBe(25);
      expect(item.points).toBeGreaterThanOrEqual(0);
      expect(item.points).toBeLessThanOrEqual(25);
    }
  });
});
