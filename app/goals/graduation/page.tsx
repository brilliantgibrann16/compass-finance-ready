"use client";

import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { PageLayout } from "@/components/ui/PageLayout";
import { GoalDetailScreen } from "@/components/goals/GoalDetailScreen";

export default function GraduationGoalPage() {
  const hydrated = useHydrated();
  const goal = useAppStore((s) => s.savingsGoals.find((g) => g.type === "graduation"));

  if (!hydrated) return <LoadingScreen />;

  if (!goal) {
    return (
      <PageLayout title="Graduation Fund">
        <p className="text-sm text-ink-muted">No graduation goal found.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={goal.name} subtitle="Saving toward graduation">
      <GoalDetailScreen goal={goal} showMilestones />
    </PageLayout>
  );
}
