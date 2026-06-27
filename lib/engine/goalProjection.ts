import { addMonths, differenceInCalendarMonths, format } from "date-fns";

/**
 * Generic shape shared by SavingsGoal and WishlistItem. Both are
 * "save toward a target" entities — rather than forcing the two
 * domain types to share field names, callers map their specific
 * shape onto this one (see GoalTeaser / WishlistItemCard for the
 * one-line adapters).
 */
export interface ProjectableTarget {
  currentAmount: number;
  targetAmount: number;
  targetDate?: string;
  monthlyContribution: number;
}

export interface GoalProjection {
  progressPct: number;
  remainingAmount: number;
  monthsToTarget: number;
  projectedCompletionDate: Date | null;
  projectedCompletionLabel: string;
  isOnTrack: boolean | null; // null when there's no target date to compare against
}

export function getGoalProjection(target: ProjectableTarget, today: Date = new Date()): GoalProjection {
  const progressPct = Math.min(100, Math.round((target.currentAmount / target.targetAmount) * 100));
  const remainingAmount = Math.max(0, target.targetAmount - target.currentAmount);

  const monthsToTarget =
    target.monthlyContribution > 0
      ? Math.ceil(remainingAmount / target.monthlyContribution)
      : Infinity;

  const projectedCompletionDate =
    Number.isFinite(monthsToTarget) ? addMonths(today, monthsToTarget) : null;

  const projectedCompletionLabel = projectedCompletionDate
    ? format(projectedCompletionDate, "MMM yyyy")
    : "Set a monthly contribution";

  let isOnTrack: boolean | null = null;
  if (target.targetDate && projectedCompletionDate) {
    const targetDate = new Date(target.targetDate);
    isOnTrack = differenceInCalendarMonths(targetDate, projectedCompletionDate) >= 0;
  }

  return {
    progressPct,
    remainingAmount,
    monthsToTarget,
    projectedCompletionDate,
    projectedCompletionLabel,
    isOnTrack,
  };
}

/**
 * How much would need to be saved per month to hit `targetDate` exactly
 * — distinct from `monthlyContribution`, which is what's actually
 * committed right now. Returns null when there's no target date.
 */
export function getRequiredMonthlyContribution(
  target: ProjectableTarget,
  today: Date = new Date()
): number | null {
  if (!target.targetDate) return null;
  const remainingAmount = Math.max(0, target.targetAmount - target.currentAmount);
  const monthsRemaining = Math.max(1, differenceInCalendarMonths(new Date(target.targetDate), today));
  return Math.ceil(remainingAmount / monthsRemaining);
}

/** Standard milestone checkpoints, expressed as a fraction of the target. */
export function getMilestones(targetAmount: number): number[] {
  return [0.125, 0.25, 0.5, 0.75, 1].map((frac) => Math.round(targetAmount * frac));
}
