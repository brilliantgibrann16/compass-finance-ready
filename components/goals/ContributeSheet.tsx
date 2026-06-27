"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatNumberID } from "@/lib/utils/currency";
import { PlusCircle } from "lucide-react";

interface ContributeSheetProps {
  open: boolean;
  onClose: () => void;
  /** Name of the goal/item being contributed to, for the sheet title. */
  targetName: string;
  onContribute: (amount: number) => void;
}

export function ContributeSheet({ open, onClose, targetName, onContribute }: ContributeSheetProps) {
  const [text, setText] = useState("");
  const amount = Number(text.replace(/\D/g, ""));

  function handleClose() {
    setText("");
    onClose();
  }

  function handleSave() {
    if (!amount || amount <= 0) return;
    onContribute(amount);
    handleClose();
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={`Add to ${targetName}`}>
      <input
        autoFocus
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && amount > 0) handleSave();
        }}
        placeholder="500000"
        className="w-full rounded-xl border border-border bg-bg px-4 py-3.5 font-mono text-lg text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
      />
      {amount > 0 && (
        <p className="mt-2 text-sm text-ink-muted">Rp{formatNumberID(amount)}</p>
      )}
      <button
        onClick={handleSave}
        disabled={!amount || amount <= 0}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-medium text-bg transition hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PlusCircle size={18} />
        Add funds
      </button>
    </BottomSheet>
  );
}
