"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAppStore } from "@/lib/store";
import type { WishlistItem, WishlistPriority } from "@/lib/types";
import { clsx } from "clsx";
import { Check } from "lucide-react";

const PRIORITIES: { id: WishlistPriority; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

interface WishlistFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** When set, the sheet edits this item instead of creating a new one. */
  editingItem?: WishlistItem | null;
}

function toDigits(value: string): number {
  return Number(value.replace(/\D/g, "")) || 0;
}

export function WishlistFormSheet({ open, onClose, editingItem }: WishlistFormSheetProps) {
  const addWishlistItem = useAppStore((s) => s.addWishlistItem);
  const updateWishlistItem = useAppStore((s) => s.updateWishlistItem);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<WishlistPriority>("medium");

  useEffect(() => {
    if (!open) return;
    setName(editingItem?.name ?? "");
    setTargetAmount(editingItem ? String(editingItem.targetAmount) : "");
    setSavedAmount(editingItem ? String(editingItem.savedAmount) : "0");
    setMonthlyContribution(editingItem ? String(editingItem.monthlyContribution) : "");
    setTargetDate(editingItem?.targetDate ?? "");
    setPriority(editingItem?.priority ?? "medium");
  }, [open, editingItem]);

  const isValid = name.trim().length > 0 && toDigits(targetAmount) > 0;

  function handleSave() {
    if (!isValid) return;

    const payload = {
      name: name.trim(),
      targetAmount: toDigits(targetAmount),
      savedAmount: toDigits(savedAmount),
      monthlyContribution: toDigits(monthlyContribution),
      targetDate: targetDate || undefined,
      priority,
    };

    if (editingItem) {
      updateWishlistItem(editingItem.id, payload);
    } else {
      addWishlistItem(payload);
    }
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={editingItem ? "Edit item" : "Add to wishlist"}>
      <div className="space-y-4">
        <Field label="Name">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="iQOO Phone"
            className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
          />
        </Field>

        <Field label="Target amount (Rp)">
          <input
            type="text"
            inputMode="numeric"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="4500000"
            className="w-full rounded-xl border border-border bg-bg px-4 py-3 font-mono text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
          />
        </Field>

        <Field label="Already saved (Rp)">
          <input
            type="text"
            inputMode="numeric"
            value={savedAmount}
            onChange={(e) => setSavedAmount(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-border bg-bg px-4 py-3 font-mono text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
          />
        </Field>

        <Field label="Monthly contribution (Rp, optional)">
          <input
            type="text"
            inputMode="numeric"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
            placeholder="150000"
            className="w-full rounded-xl border border-border bg-bg px-4 py-3 font-mono text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
          />
        </Field>

        <Field label="Target date (optional)">
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-ink focus:border-gold focus:outline-none [color-scheme:dark]"
          />
        </Field>

        <Field label="Priority">
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPriority(p.id)}
                className={clsx(
                  "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition",
                  priority === p.id
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border-soft text-ink-muted hover:border-border"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <button
          onClick={handleSave}
          disabled={!isValid}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-medium text-bg transition hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check size={18} />
          {editingItem ? "Save changes" : "Add to wishlist"}
        </button>
      </div>
    </BottomSheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</label>
      {children}
    </div>
  );
}
