"use client";

import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { InstallmentRow } from "@/components/debt/InstallmentRow";
import { formatRupiah } from "@/lib/utils/currency";
import { getDebtSummary } from "@/lib/engine/debtEngine";
import type { Debt } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { PartyPopper } from "lucide-react";

export function DebtSourceSection({ debt }: { debt: Debt }) {
  const toggleInstallmentPaid = useAppStore((s) => s.toggleInstallmentPaid);
  const summary = getDebtSummary(debt);
  const paidPct = summary.totalAmount > 0 ? Math.round((summary.paidAmount / summary.totalAmount) * 100) : 100;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display font-medium text-ink">{debt.name}</span>
        {summary.isPaidOff ? (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald">
            <PartyPopper size={14} /> Paid off
          </span>
        ) : (
          <span className="font-mono text-xs text-ink-muted">{paidPct}% paid</span>
        )}
      </div>

      <ProgressBar progress={paidPct} color={summary.isPaidOff ? "#34D399" : "#F0B429"} />

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-ink-muted">{formatRupiah(summary.remainingAmount)} remaining</span>
        <span className="text-ink-faint">of {formatRupiah(summary.totalAmount)}</span>
      </div>

      <div className="mt-4 space-y-2">
        {debt.installments
          .slice()
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
          .map((installment) => (
            <InstallmentRow
              key={installment.id}
              installment={installment}
              onToggle={() => toggleInstallmentPaid(debt.id, installment.id)}
            />
          ))}
      </div>
    </Card>
  );
}
