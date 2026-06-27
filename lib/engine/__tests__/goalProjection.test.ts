import { describe, it, expect } from "vitest";
import { getGoalProjection, getRequiredMonthlyContribution, getMilestones } from "../goalProjection";
import type { ProjectableTarget } from "../goalProjection";

const TODAY = new Date("2026-06-20");

const makeTarget = (overrides?: Partial<ProjectableTarget>): ProjectableTarget => ({
  currentAmount: 3500000,
  targetAmount: 10000000,
  monthlyContribution: 500000,
  ...overrides,
});

describe("goalProjection", () => {
  describe("getGoalProjection", () => {
    it("computes progress percentage", () => {
      const result = getGoalProjection(makeTarget(), TODAY);
      expect(result.progressPct).toBe(35);
    });

    it("computes remaining amount", () => {
      const result = getGoalProjection(makeTarget(), TODAY);
      expect(result.remainingAmount).toBe(6500000);
    });

    it("computes months to target based on monthly contribution", () => {
      const result = getGoalProjection(makeTarget(), TODAY);
      expect(result.monthsToTarget).toBe(Math.ceil(6500000 / 500000));
    });

    it("returns Infinity months when no contribution", () => {
      const result = getGoalProjection(makeTarget({ monthlyContribution: 0 }), TODAY);
      expect(result.monthsToTarget).toBe(Infinity);
      expect(result.projectedCompletionDate).toBeNull();
      expect(result.projectedCompletionLabel).toBe("Set a monthly contribution");
    });

    it("caps progress at 100%", () => {
      const result = getGoalProjection(makeTarget({ currentAmount: 15000000, targetAmount: 10000000 }), TODAY);
      expect(result.progressPct).toBe(100);
      expect(result.remainingAmount).toBe(0);
    });

    it("projects a completion date", () => {
      const result = getGoalProjection(makeTarget(), TODAY);
      expect(result.projectedCompletionDate).not.toBeNull();
      expect(result.projectedCompletionLabel).toMatch(/\w+ \d{4}/);
    });

    it("determines on-track status when target date is provided", () => {
      const onTrack = getGoalProjection(
        makeTarget({ targetDate: "2030-01-01" }),
        TODAY
      );
      expect(onTrack.isOnTrack).toBe(true);

      const offTrack = getGoalProjection(
        makeTarget({ targetDate: "2026-08-01", monthlyContribution: 100000 }),
        TODAY
      );
      expect(offTrack.isOnTrack).toBe(false);
    });

    it("returns null isOnTrack when no target date", () => {
      const result = getGoalProjection(makeTarget(), TODAY);
      expect(result.isOnTrack).toBeNull();
    });
  });

  describe("getRequiredMonthlyContribution", () => {
    it("calculates required monthly amount", () => {
      const result = getRequiredMonthlyContribution(
        makeTarget({ targetDate: "2027-06-20" }),
        TODAY
      );
      expect(result).not.toBeNull();
      expect(result!).toBe(Math.ceil(6500000 / 12));
    });

    it("returns null when no target date", () => {
      const result = getRequiredMonthlyContribution(makeTarget(), TODAY);
      expect(result).toBeNull();
    });

    it("uses at least 1 month remaining", () => {
      const result = getRequiredMonthlyContribution(
        makeTarget({ targetDate: "2026-06-20" }),
        TODAY
      );
      expect(result).not.toBeNull();
      expect(result!).toBe(6500000);
    });
  });

  describe("getMilestones", () => {
    it("returns 5 milestone values", () => {
      const milestones = getMilestones(1000000);
      expect(milestones).toHaveLength(5);
    });

    it("returns correct fractions of target", () => {
      const milestones = getMilestones(1000000);
      expect(milestones[0]).toBe(125000);
      expect(milestones[1]).toBe(250000);
      expect(milestones[2]).toBe(500000);
      expect(milestones[3]).toBe(750000);
      expect(milestones[4]).toBe(1000000);
    });

    it("rounds milestone values", () => {
      const milestones = getMilestones(333333);
      for (const m of milestones) {
        expect(m).toBe(Math.round(m));
      }
    });
  });
});
