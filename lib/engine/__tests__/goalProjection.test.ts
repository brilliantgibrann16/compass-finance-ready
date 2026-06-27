// lib/engine/__tests__/goalProjection.test.ts
import { describe, it, expect } from "vitest";
import { getGoalProjection, getRequiredMonthlyContribution, getMilestones } from "../goalProjection";
import type { ProjectableTarget } from "../goalProjection";

// ── Fixtures ──────────────────────────────────────────────────────────
const today = new Date("2026-06-20");

const basicGoal: ProjectableTarget = {
  currentAmount: 2_500_000,
  targetAmount: 5_000_000,
  monthlyContribution: 500_000,
  targetDate: "2027-06-01",
};

// ── getGoalProjection ─────────────────────────────────────────────────

describe("getGoalProjection", () => {
  it("calculates progress percentage", () => {
    const result = getGoalProjection(basicGoal, today);
    expect(result.progressPct).toBe(50);
  });

  it("calculates remaining amount", () => {
    const result = getGoalProjection(basicGoal, today);
    expect(result.remainingAmount).toBe(2_500_000);
  });

  it("calculates months to target", () => {
    const result = getGoalProjection(basicGoal, today);
    // 2.5M remaining / 500k/month = 5 months
    expect(result.monthsToTarget).toBe(5);
  });

  it("projects completion date", () => {
    const result = getGoalProjection(basicGoal, today);
    expect(result.projectedCompletionDate).not.toBeNull();
    expect(result.projectedCompletionLabel).toMatch(/Nov 2026/);
  });

  it("returns isOnTrack=true when projected before target", () => {
    const result = getGoalProjection(basicGoal, today);
    expect(result.isOnTrack).toBe(true);
  });

  it("returns isOnTrack=false when projected after target", () => {
    const behindGoal: ProjectableTarget = {
      ...basicGoal,
      monthlyContribution: 50_000, // way too slow
      targetDate: "2026-09-01",
    };
    const result = getGoalProjection(behindGoal, today);
    expect(result.isOnTrack).toBe(false);
  });

  it("returns isOnTrack=null when no target date", () => {
    const noDateGoal: ProjectableTarget = {
      ...basicGoal,
      targetDate: undefined,
    };
    const result = getGoalProjection(noDateGoal, today);
    expect(result.isOnTrack).toBeNull();
  });

  it("caps progress at 100%", () => {
    const overFunded: ProjectableTarget = {
      ...basicGoal,
      currentAmount: 6_000_000,
    };
    const result = getGoalProjection(overFunded, today);
    expect(result.progressPct).toBe(100);
    expect(result.remainingAmount).toBe(0);
  });

  it("returns Infinity months when no contribution", () => {
    const noContrib: ProjectableTarget = {
      ...basicGoal,
      monthlyContribution: 0,
    };
    const result = getGoalProjection(noContrib, today);
    expect(result.monthsToTarget).toBe(Infinity);
    expect(result.projectedCompletionDate).toBeNull();
    expect(result.projectedCompletionLabel).toBe("Set a monthly contribution");
  });

  it("returns 0 months when already funded", () => {
    const funded: ProjectableTarget = {
      currentAmount: 5_000_000,
      targetAmount: 5_000_000,
      monthlyContribution: 500_000,
    };
    const result = getGoalProjection(funded, today);
    expect(result.monthsToTarget).toBe(0);
    expect(result.remainingAmount).toBe(0);
  });
});

// ── getRequiredMonthlyContribution ────────────────────────────────────

describe("getRequiredMonthlyContribution", () => {
  it("calculates required monthly amount to hit target date", () => {
    const result = getRequiredMonthlyContribution(basicGoal, today);
    expect(result).not.toBeNull();
    // ~2.5M remaining, ~12 months to Jun 2027 = ~209k/month
    expect(result!).toBeGreaterThan(200_000);
    expect(result!).toBeLessThan(250_000);
  });

  it("returns null when no target date", () => {
    const noDate: ProjectableTarget = { ...basicGoal, targetDate: undefined };
    const result = getRequiredMonthlyContribution(noDate, today);
    expect(result).toBeNull();
  });

  it("returns full remaining when only 1 month left", () => {
    const urgentGoal: ProjectableTarget = {
      ...basicGoal,
      targetDate: "2026-07-01",
    };
    const result = getRequiredMonthlyContribution(urgentGoal, today);
    expect(result).toBe(2_500_000);
  });
});

// ── getMilestones ─────────────────────────────────────────────────────

describe("getMilestones", () => {
  it("returns 5 standard milestone checkpoints", () => {
    const milestones = getMilestones(10_000_000);
    expect(milestones).toHaveLength(5);
    expect(milestones).toEqual([1_250_000, 2_500_000, 5_000_000, 7_500_000, 10_000_000]);
  });

  it("rounds to integers", () => {
    const milestones = getMilestones(1_000_003);
    milestones.forEach((m) => expect(Number.isInteger(m)).toBe(true));
  });
});
