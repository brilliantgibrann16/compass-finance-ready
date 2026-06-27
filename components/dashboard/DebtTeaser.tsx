"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatRupiahCompact } from "@/lib/utils/currency";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { Debt } from "@/lib/types";
import { getAllDebtsSummary, getDebtFreeCountdown } from "@/lib/engine/debtEngine";
import { format, parseISO } from "date-fns";
import { Landmark, PartyPopper } from "lucide-react";

export function DebtTeaser({ debts }: { debts: Debt[] }) {
  const { t } = useTranslation();
  const summary = getAllDebtsSummary(debts);
  const countdown = getDebtFreeCountdown(debts);

  if (summary.isAllPaidOff) {
    return (
      <Link href="/debt">
        <Card variant="glow" className="cursor-pointer">
          <div className="flex items-center gap-2 text-emerald">
            <PartyPopper size={18} />
            <span className="font-medium">{t("paidOff")}! 🎉</span>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href="/debt">
      <Card className="cursor-pointer transition hover:border-gold/30">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-coral" />
            <span className="font-medium text-ink">{t("debtOverview")}</span>
          </div>
          <span className="font-mono text-sm text-ink-muted">{summary.progressPct}% {t("paidAmount")}</span>
        </div>
        <ProgressBar progress={summary.progressPct} color="#34D399" />
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-ink-muted">{formatRupiahCompact(summary.remainingAmount)} {t("remaining")}</span>
          <span className="text-ink-faint">Target {countdown.targetLabel}</span>
        </div>
        {summary.nextDueDate && (
          <p className="mt-2 text-xs text-ink-faint">
            {t("nextPayment")} {format(parseISO(summary.nextDueDate), "d MMM")} ·{" "}
            {formatRupiahCompact(summary.nextDueAmount)}
          </p>
        )}
      </Card>
    </Link>
  );
}
