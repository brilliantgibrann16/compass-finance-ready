"use client";

import { useMemo, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CategoryBadge } from "@/components/ui/CategoryIcon";
import { parseQuickAdd } from "@/lib/engine/quickAddParser";
import { useAppStore } from "@/lib/store";
import { CATEGORY_LIST } from "@/lib/engine/categoryDetector";
import { formatNumberID } from "@/lib/utils/currency";
import { motion } from "framer-motion";
import { ArrowDownCircle, ArrowUpCircle, Check } from "lucide-react";
import { clsx } from "clsx";
import type { CategoryId } from "@/lib/types";

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
}

export function QuickAddSheet({ open, onClose }: QuickAddSheetProps) {
  const [text, setText] = useState("");
  const [categoryOverride, setCategoryOverride] = useState<CategoryId | null>(null);
  const addTransaction = useAppStore((s) => s.addTransaction);

  const parsed = useMemo(() => parseQuickAdd(text), [text]);
  const effectiveCategory = categoryOverride ?? parsed?.category ?? "other";

  function handleClose() {
    setText("");
    setCategoryOverride(null);
    onClose();
  }

  function handleSave() {
    if (!parsed) return;
    addTransaction({
      amount: parsed.amount,
      kind: parsed.kind,
      category: effectiveCategory,
      merchant: parsed.description || undefined,
      source: "quick-add",
    });
    handleClose();
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Quick Add">
      <input
        autoFocus
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setCategoryOverride(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && parsed) handleSave();
        }}
        placeholder="+11000 geprek"
        className="w-full rounded-xl border border-border bg-bg px-4 py-3.5 font-mono text-lg text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
      />
      <p className="mt-2 text-xs text-ink-faint">
        Bare number or “+” = expense · “-” = income, e.g. <span className="font-mono">-700000 transfer</span>
      </p>

      {parsed && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-3"
        >
          <div className="flex items-center justify-between rounded-xl border border-border-soft bg-bg p-3">
            <div className="flex items-center gap-2">
              {parsed.kind === "expense" ? (
                <ArrowUpCircle size={18} className="text-coral" />
              ) : (
                <ArrowDownCircle size={18} className="text-emerald" />
              )}
              <span className="font-display text-lg font-semibold text-ink">
                Rp{formatNumberID(parsed.amount)}
              </span>
              <span className="text-sm text-ink-muted">
                {parsed.kind === "expense" ? "expense" : "income"}
              </span>
            </div>
            <CategoryBadge category={effectiveCategory} />
          </div>

          {parsed.kind === "expense" && (
            <div className="flex flex-wrap gap-2">
              {CATEGORY_LIST.filter((c) => c.id !== "savings").map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryOverride(c.id)}
                  className={clsx(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    effectiveCategory === c.id
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border-soft text-ink-muted hover:border-border"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-medium text-bg transition hover:bg-gold/90"
          >
            <Check size={18} />
            Save transaction
          </button>
        </motion.div>
      )}
    </BottomSheet>
  );
}
