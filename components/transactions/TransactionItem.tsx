"use client";

import { motion } from "framer-motion";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { formatNumberID } from "@/lib/utils/currency";
import { CATEGORIES } from "@/lib/engine/categoryDetector";
import type { Transaction } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

export function TransactionItem({
  transaction,
  onDelete,
}: {
  transaction: Transaction;
  onDelete: (id: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const meta = CATEGORIES[transaction.category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 py-3"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${meta.color}1A` }}
      >
        <CategoryIcon category={transaction.category} size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {transaction.merchant || meta.label}
        </p>
        <p className="text-xs text-ink-faint">{format(parseISO(transaction.date), "d MMM")}</p>
      </div>

      <span
        className={clsx(
          "font-mono text-sm font-medium",
          transaction.kind === "expense" ? "text-ink" : "text-emerald"
        )}
      >
        {transaction.kind === "expense" ? "-" : "+"}Rp{formatNumberID(transaction.amount)}
      </span>

      <button
        aria-label={confirmingDelete ? "Confirm delete" : "Delete transaction"}
        onClick={() => {
          if (confirmingDelete) {
            onDelete(transaction.id);
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
    </motion.div>
  );
}
