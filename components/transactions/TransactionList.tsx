"use client";

import { AnimatePresence } from "framer-motion";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { Card } from "@/components/ui/Card";
import type { Transaction } from "@/lib/types";
import { Receipt } from "lucide-react";

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  limit?: number;
}

export function TransactionList({ transactions, onDelete, limit = 8 }: TransactionListProps) {
  const visible = transactions.slice(0, limit);

  return (
    <Card>
      <h3 className="mb-1 font-display text-base font-medium text-ink">Recent activity</h3>
      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Receipt size={28} className="text-ink-faint" />
          <p className="text-sm text-ink-muted">
            No transactions yet — tap + to log your first spend.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border-soft">
          <AnimatePresence initial={false}>
            {visible.map((t) => (
              <TransactionItem key={t.id} transaction={t} onDelete={onDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
