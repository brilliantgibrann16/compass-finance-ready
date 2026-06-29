"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { GoalDetailScreen } from "@/components/goals/GoalDetailScreen";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import type { SavingsGoal } from "@/lib/types";

const GOAL_SUBTITLE_BY_TYPE: Record<SavingsGoal["type"], string> = {
  graduation: "Saving toward graduation",
  emergency: "Your financial safety net",
  custom: "Track progress toward your savings target",
};

export function GoalDetailByQuery() {
  const hydrated = useHydrated();
  const searchParams = useSearchParams();
  const goalId = searchParams.get("id") ?? "";
  const goal = useAppStore((s) => s.savingsGoals.find((g) => g.id === goalId));

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold" />
      </div>
    );
  }

  if (!goal) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
        <PageHeader title="Savings Goal" subtitle="This savings target could not be found." />
        <Link
          href="/goals"
          className="mt-4 inline-flex rounded-xl border border-border-soft bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:border-gold/30 hover:text-gold"
        >
          Back to goals
        </Link>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <PageHeader title={goal.name} subtitle={GOAL_SUBTITLE_BY_TYPE[goal.type]} />
      <GoalDetailScreen goal={goal} showMilestones={goal.type === "graduation"} />
      <BottomNav />
    </main>
  );
}