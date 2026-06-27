"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { getSpendingSnapshot } from "@/lib/engine/spendingEngine";
import { getCurrentCycle } from "@/lib/engine/transferCycle";
import { getHealthScore } from "@/lib/engine/healthScore";
import { useTranslation } from "@/lib/i18n/LanguageContext";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SafeToSpendHero } from "@/components/dashboard/SafeToSpendHero";
import { StatTile } from "@/components/dashboard/StatTile";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { DebtTeaser } from "@/components/dashboard/DebtTeaser";
import { GoalTeaser } from "@/components/dashboard/GoalTeaser";
import { WishlistTeaser } from "@/components/dashboard/WishlistTeaser";
import { TransactionList } from "@/components/transactions/TransactionList";
import { QuickAddButton } from "@/components/transactions/QuickAddButton";
import { QuickAddSheet } from "@/components/transactions/QuickAddSheet";
import { SettingsSheet } from "@/components/transactions/SettingsSheet";
import { BottomNav } from "@/components/ui/BottomNav";
import { BynanceMascot } from "@/components/ui/BynanceMascot";
import { SkeletonHero, SkeletonCard } from "@/components/ui/Skeleton";
import { CalendarClock, TrendingUp } from "lucide-react";

export default function HomePage() {
  const hydrated = useHydrated();
  const { t } = useTranslation();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const balance = useAppStore((s) => s.balance);
  const transactions = useAppStore((s) => s.transactions);
  const transferSettings = useAppStore((s) => s.transferSettings);
  const debts = useAppStore((s) => s.debts);
  const savingsGoals = useAppStore((s) => s.savingsGoals);
  const wishlist = useAppStore((s) => s.wishlist);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);

  if (!hydrated) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
        <div className="mb-6 h-20 animate-pulse rounded-xl bg-bg-hover" />
        <SkeletonHero />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="mt-4"><SkeletonCard /></div>
        <BottomNav />
      </main>
    );
  }

  const today = new Date();
  const snapshot = getSpendingSnapshot(balance, transactions, transferSettings, today);
  const cycle = getCurrentCycle(today, transferSettings);

  const cycleProgressPct = cycle.daysElapsedInCycle / cycle.totalDaysInCycle;
  const balanceRemainingPct = Math.min(1, balance / Math.max(1, transferSettings.amountPerTransfer));

  const health = getHealthScore(snapshot.pace, debts, savingsGoals, cycleProgressPct, balanceRemainingPct);
  const monthlySavingsCommitment = savingsGoals.reduce((sum, g) => sum + g.monthlyContribution, 0);

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <DashboardHeader balance={balance} onSettingsClick={() => setSettingsOpen(true)} />

      <div className="mt-6">
        <SafeToSpendHero snapshot={snapshot} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile label={t("today")} value={snapshot.todaySpent} icon={CalendarClock} />
        <StatTile label={t("thisWeek")} value={snapshot.weekSpent} icon={CalendarClock} />
        <StatTile label={t("thisMonth")} value={snapshot.monthSpent} icon={CalendarClock} />
        <StatTile
          label={t("monthlySavings")}
          value={monthlySavingsCommitment}
          icon={TrendingUp}
          accent="emerald"
        />
      </div>

      <div className="mt-4">
        <HealthScoreCard result={health} />
      </div>

      {debts.length > 0 && (
        <div className="mt-4">
          <DebtTeaser debts={debts} />
        </div>
      )}

      {savingsGoals.length > 0 && (
        <div className="mt-4 space-y-3">
          {savingsGoals.map((goal) => (
            <GoalTeaser key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <div className="mt-4">
        <WishlistTeaser items={wishlist} />
      </div>

      <div className="mt-4">
        <TransactionList transactions={transactions} onDelete={deleteTransaction} />
      </div>

      <QuickAddButton onClick={() => setQuickAddOpen(true)} />
      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Bynance floating companion */}
      <BynanceMascot />

      <BottomNav />
    </main>
  );
}
