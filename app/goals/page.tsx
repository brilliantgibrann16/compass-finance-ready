"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { PageHeader } from "@/components/ui/PageHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { GoalTeaser } from "@/components/dashboard/GoalTeaser";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Target } from "lucide-react";

export default function SavingsGoalsIndexPage() {
  const hydrated = useHydrated();
  const { t } = useTranslation();
  const goals = useAppStore((s) => s.savingsGoals);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold" />
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <PageHeader title={t("savingsGoalsMenu")} subtitle={t("savingsGoalsDesc")} />

      {goals.length === 0 ? (
        <div className="rounded-2xl border border-border-soft bg-surface p-6 text-center">
          <Target size={28} className="mx-auto mb-3 text-gold" />
          <p className="text-sm text-ink-muted">{t("noTransactions")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalTeaser key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link
          href="/goals/emergency"
          className="rounded-2xl border border-border-soft bg-surface p-4 text-center text-sm font-medium text-ink transition hover:border-gold/30 hover:text-gold"
        >
          Emergency Fund
        </Link>
        <Link
          href="/goals/graduation"
          className="rounded-2xl border border-border-soft bg-surface p-4 text-center text-sm font-medium text-ink transition hover:border-gold/30 hover:text-gold"
        >
          Graduation Fund
        </Link>
      </div>

      <BottomNav />
    </main>
  );
}
