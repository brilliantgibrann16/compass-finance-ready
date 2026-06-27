"use client";

import { formatRupiah } from "@/lib/utils/currency";
import type { DebtInstallment } from "@/lib/types";
import { format, parseISO, isPast, isToday } from "date-fns";
import { Check } from "lucide-react";
import { clsx } from "clsx";

interface InstallmentRowProps {
  installment: DebtInstallment;
  onToggle: () => void;
}

export function InstallmentRow({ installment, onToggle }: InstallmentRowProps) {
  const dueDate = parseISO(installment.dueDate);
  const overdue = !installment.isPaid && isPast(dueDate) && !isToday(dueDate);

  return (
    <button
      onClick={onToggle}
      className={clsx(
        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
        installment.isPaid
          ? "border-emerald/20 bg-emerald/5"
          : overdue
            ? "border-coral/30 bg-coral/5"
            : "border-border-soft bg-bg hover:border-border"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            "flex h-6 w-6 items-center justify-center rounded-full border transition",
            installment.isPaid
              ? "border-emerald bg-emerald text-bg"
              : "border-border-soft text-transparent"
          )}
        >
          <Check size={14} strokeWidth={3} />
        </span>
        <div>
          <p className={clsx("text-sm font-medium", installment.isPaid ? "text-ink-muted line-through" : "text-ink")}>
            {format(dueDate, "d MMM yyyy")}
          </p>
          {overdue && <p className="text-xs text-coral">Overdue</p>}
        </div>
      </div>
      <span className={clsx("font-mono text-sm", installment.isPaid ? "text-ink-faint" : "text-ink")}>
        {formatRupiah(installment.amount)}
      </span>
    </button>
  );
}
