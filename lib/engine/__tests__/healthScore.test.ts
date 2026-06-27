// lib/engine/__tests__/healthScore.test.ts
import { describe, it, expect } from "vitest";
import { getHealthScore } from "../healthScore";
import type { Debt, SavingsGoal } from "../../types";

// ── Fixtures ──────────────────────────────────────────────────────────
function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: "test-debt",
    name: "Test Debt",
    installments: [
      { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-07-25", amount: 500_000, isPaid: true },
      { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-08-25", amount: 500_000, isPaid: false },
    ],
    ...overrides,
  };
}

function makeGoal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: "test-goal",
    name: "Emergency Fund",
    type: "emergency",
    targetAmount: 5_000_000,
    currentAmount: 2_500_000,
    monthlyContribution: 500_000,
    createdAt: "2026-06-01T00:00:00.000Z",
    milestonesReached: [25, 50],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("getHealthScore", () => {
  it("returns a score between 0 and 100", () => {
    const result = getHealthScore("on-track", [], [], 0.5, 0.5);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns green band for high score (pace=ahead, no debts, goals met)", () => {
    const goal = makeGoal({ currentAmount: 5_000_000, targetAmount: 5_000_000 });
    const result = getHealthScore("ahead", [], [goal], 0.3, 0.7);
    expect(result.band).toBe("green");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("returns red band for worst-case scenario", () => {
    const debt = makeDebt({
      installments: [
        { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-07-25", amount: 500_000, isPaid: false },
        { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-08-25", amount: 500_000, isPaid: false },
      ],
    });
    const goal = makeGoal({ currentAmount: 0 });
    // pace=behind, all debt unpaid, no savings, overspent buffer
    const result = getHealthScore("behind", [debt], [goal], 0.9, 0.1);
    expect(result.band).toBe("red");
    expect(result.score).toBeLessThan(60);
  });

  it("awards max pace score (25) for ahead", () => {
    const result = getHealthScore("ahead", [], [], 0.5, 0.5);
    const paceBreakdown = result.breakdown.find((b) => b.label === "Spending pace");
    expect(paceBreakdown?.points).toBe(25);
  });

  it("awards 18 pace points for on-track", () => {
    const result = getHealthScore("on-track", [], [], 0.5, 0.5);
    const paceBreakdown = result.breakdown.find((b) => b.label === "Spending pace");
    expect(paceBreakdown?.points).toBe(18);
  });

  it("awards 6 pace points for behind", () => {
    const result = getHealthScore("behind", [], [], 0.5, 0.5);
    const paceBreakdown = result.breakdown.find((b) => b.label === "Spending pace");
    expect(paceBreakdown?.points).toBe(6);
  });

  it("gives 25 debt points when all debts are paid off", () => {
    const paidDebt = makeDebt({
      installments: [
        { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-07-25", amount: 500_000, isPaid: true },
        { id: "inst-" + Math.random().toString(36).slice(2), dueDate: "2026-08-25", amount: 500_000, isPaid: true },
      ],
    });
    const result = getHealthScore("on-track", [paidDebt], [], 0.5, 0.5);
    const debtBreakdown = result.breakdown.find((b) => b.label === "Debt trajectory");
    expect(debtBreakdown?.points).toBe(25);
  });

  it("gives 25 debt points when no debts exist", () => {
    const result = getHealthScore("on-track", [], [], 0.5, 0.5);
    const debtBreakdown = result.breakdown.find((b) => b.label === "Debt trajectory");
    expect(debtBreakdown?.points).toBe(25);
  });

  it("gives 12 savings points when no goals are set (neutral)", () => {
    const result = getHealthScore("on-track", [], [], 0.5, 0.5);
    const savingsBreakdown = result.breakdown.find((b) => b.label === "Savings progress");
    expect(savingsBreakdown?.points).toBe(12);
  });

  it("gives 25 savings points when goals are 100% funded", () => {
    const goal = makeGoal({ currentAmount: 5_000_000, targetAmount: 5_000_000 });
    const result = getHealthScore("on-track", [], [goal], 0.5, 0.5);
    const savingsBreakdown = result.breakdown.find((b) => b.label === "Savings progress");
    expect(savingsBreakdown?.points).toBe(25);
  });

  it("buffer score rewards having more balance than cycle elapsed", () => {
    const resultGood = getHealthScore("on-track", [], [], 0.3, 0.8);
    const resultBad = getHealthScore("on-track", [], [], 0.8, 0.2);
    const bufferGood = resultGood.breakdown.find((b) => b.label === "Cycle buffer")!.points;
    const bufferBad = resultBad.breakdown.find((b) => b.label === "Cycle buffer")!.points;
    expect(bufferGood).toBeGreaterThan(bufferBad);
  });

  it("always returns exactly 4 breakdown items", () => {
    const result = getHealthScore("on-track", [], [], 0.5, 0.5);
    expect(result.breakdown).toHaveLength(4);
    expect(result.breakdown.every((b) => b.maxPoints === 25)).toBe(true);
  });
});
