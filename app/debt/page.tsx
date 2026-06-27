"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { getAllDebtsSummary, getDebtFreeCountdown } from "@/lib/engine/debtEngine";
import { getMonthlyTimeline } from "@/lib/engine/debtEngine";

import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { PageLayout } from "@/components/ui/PageLayout";
import { DebtCountdownHero } from "@/components/debt/DebtCountdownHero";
import { DebtSourceSection } from "@/components/debt/DebtSourceSection";
import { DebtTimeline } from "@/components/debt/DebtTimeline";
import { DebtFreeCelebration } from "@/components/debt/DebtFreeCelebration";

export default function DebtPage() {
  const hydrated = useHydrated();
  const debts = useAppStore((s) => s.debts);
  const [celebrating, setCelebrating] = useState(false);
  const wasAllPaidOff = useRef<boolean | null>(null);

  const summary = getAllDebtsSummary(debts);

  useEffect(() => {
    if (wasAllPaidOff.current === false && summary.isAllPaidOff) {
      setCelebrating(true);
    }
    wasAllPaidOff.current = summary.isAllPaidOff;
  }, [summary.isAllPaidOff]);

  if (!hydrated) return <LoadingScreen />;

  const countdown = getDebtFreeCountdown(debts);
  const months = getMonthlyTimeline(debts);

  return (
    <PageLayout title="Debt-Free Mode" subtitle="Track every installment to zero">
      <DebtCountdownHero summary={summary} countdown={countdown} />

      <div className="mt-6 space-y-4">
        {debts.map((debt) => (
          <DebtSourceSection key={debt.id} debt={debt} />
        ))}
      </div>

      <div className="mt-4">
        <DebtTimeline months={months} />
      </div>

      <DebtFreeCelebration open={celebrating} onClose={() => setCelebrating(false)} />
    </PageLayout>
  );
}
