"use client";

import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { PageLayout } from "@/components/ui/PageLayout";
import { GoalDetailScreen } from "@/components/goals/GoalDetailScreen";

export default function EmergencyGoalPage() {
  const hydrated = useHydrated();
  const goal = useAppStore((s) => s.savingsGoals.find((g) => g.type === "emergency"));

  if (!hydrated) return <LoadingScreen />;

  if (!goal) {
    return (
      <PageLayout title="Emergency Fund">
        <p className="text-sm text-ink-muted">No emergency fund goal found.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={goal.name} subtitle="Your financial safety net">
      <GoalDetailScreen goal={goal} showMilestones={false} />
    </PageLayout>
  );
}
