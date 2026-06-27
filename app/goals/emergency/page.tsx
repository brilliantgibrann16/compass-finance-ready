"use client";

import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { PageHeader } from "@/components/ui/PageHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { GoalDetailScreen } from "@/components/goals/GoalDetailScreen";

export default function EmergencyGoalPage() {
  const hydrated = useHydrated();
  const goal = useAppStore((s) => s.savingsGoals.find((g) => g.type === "emergency"));

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
        <PageHeader title="Emergency Fund" />
        <p className="text-sm text-ink-muted">No emergency fund goal found.</p>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <PageHeader title={goal.name} subtitle="Your financial safety net" />
      <GoalDetailScreen goal={goal} showMilestones={false} />
      <BottomNav />
    </main>
  );
}
