"use client";

import { Card } from "@/components/ui/Card";
import { formatRupiah } from "@/lib/utils/currency";
import type { TimelineMonth } from "@/lib/engine/debtEngine";
import { clsx } from "clsx";

export function DebtTimeline({ months }: { months: TimelineMonth[] }) {
  return (
    <Card>
      <h3 className="mb-4 font-display font-medium text-ink">Monthly timeline</h3>
      <div className="space-y-0">
        {months.map((month, idx) => (
          <div key={month.monthKey} className="relative pl-6">
            {idx < months.length - 1 && (
              <div className="absolute left-[7px] top-5 h-full w-px bg-border-soft" />
            )}
            <span
              className={clsx(
                "absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2",
                month.isFullyPaid ? "border-emerald bg-emerald" : "border-gold bg-bg-raised"
              )}
            />
            <div className="pb-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{month.monthLabel}</span>
                <span className="font-mono text-sm text-ink-muted">{formatRupiah(month.monthTotal)}</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {month.entries.map((entry) => (
                  <p
                    key={entry.installment.id}
                    className={clsx(
                      "text-xs",
                      entry.installment.isPaid ? "text-ink-faint line-through" : "text-ink-muted"
                    )}
                  >
                    {entry.debtName} — {formatRupiah(entry.installment.amount)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
