"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getGoalProjection } from "@/lib/engine/goalProjection";
import { formatRupiah } from "@/lib/utils/currency";
import { useAppStore } from "@/lib/store";
import type { WishlistItem } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";
import { clsx } from "clsx";

const PRIORITY_STYLES: Record<WishlistItem["priority"], string> = {
  high: "border-coral/30 bg-coral/10 text-coral",
  medium: "border-gold/30 bg-gold/10 text-gold",
  low: "border-border-soft bg-bg text-ink-muted",
};

export function WishlistItemCard({
  item,
  onEdit,
}: {
  item: WishlistItem;
  onEdit: () => void;
}) {
  const deleteWishlistItem = useAppStore((s) => s.deleteWishlistItem);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // WishlistItem and SavingsGoal are distinct domain types that both
  // describe "saving toward a target" — map the field names onto the
  // shared ProjectableTarget shape rather than coupling the two types.
  const projection = getGoalProjection({
    currentAmount: item.savedAmount,
    targetAmount: item.targetAmount,
    targetDate: item.targetDate,
    monthlyContribution: item.monthlyContribution,
  });

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <span className="font-medium text-ink">{item.name}</span>
          <span
            className={clsx(
              "ml-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              PRIORITY_STYLES[item.priority]
            )}
          >
            {item.priority}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label="Edit item"
            onClick={onEdit}
            className="rounded-full p-1.5 text-ink-faint transition hover:bg-bg-hover hover:text-gold"
          >
            <Pencil size={14} />
          </button>
          <button
            aria-label={confirmingDelete ? "Confirm delete" : "Delete item"}
            onClick={() => {
              if (confirmingDelete) {
                deleteWishlistItem(item.id);
              } else {
                setConfirmingDelete(true);
                setTimeout(() => setConfirmingDelete(false), 2500);
              }
            }}
            className={clsx(
              "rounded-full p-1.5 transition",
              confirmingDelete ? "bg-coral/15 text-coral" : "text-ink-faint hover:bg-bg-hover hover:text-coral"
            )}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <ProgressBar progress={projection.progressPct} />

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-ink-muted">
          {formatRupiah(item.savedAmount)} / {formatRupiah(item.targetAmount)}
        </span>
        <span className="text-ink-faint">Proj. {projection.projectedCompletionLabel}</span>
      </div>
    </Card>
  );
}
