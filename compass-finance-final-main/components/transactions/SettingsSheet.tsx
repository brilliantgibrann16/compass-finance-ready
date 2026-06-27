"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAppStore } from "@/lib/store";
import { Check } from "lucide-react";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-ink-muted">{children}</label>;
}

const inputClass =
  "w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 font-mono text-ink focus:border-gold focus:outline-none";

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const balance = useAppStore((s) => s.balance);
  const transferSettings = useAppStore((s) => s.transferSettings);
  const setBalance = useAppStore((s) => s.setBalance);
  const updateTransferSettings = useAppStore((s) => s.updateTransferSettings);

  const [balanceInput, setBalanceInput] = useState(String(balance));
  const [dayOne, setDayOne] = useState(String(transferSettings.dayOne));
  const [dayTwo, setDayTwo] = useState(String(transferSettings.dayTwo));
  const [amountPerTransfer, setAmountPerTransfer] = useState(String(transferSettings.amountPerTransfer));

  function handleSave() {
    const parsedBalance = parseInt(balanceInput.replace(/\D/g, ""), 10);
    const parsedDayOne = parseInt(dayOne, 10);
    const parsedDayTwo = parseInt(dayTwo, 10);
    const parsedAmount = parseInt(amountPerTransfer.replace(/\D/g, ""), 10);

    if (Number.isFinite(parsedBalance)) setBalance(parsedBalance);
    if (
      Number.isFinite(parsedDayOne) &&
      Number.isFinite(parsedDayTwo) &&
      parsedDayOne >= 1 &&
      parsedDayOne < parsedDayTwo &&
      parsedDayTwo <= 28
    ) {
      updateTransferSettings({ dayOne: parsedDayOne, dayTwo: parsedDayTwo });
    }
    if (Number.isFinite(parsedAmount)) {
      updateTransferSettings({ amountPerTransfer: parsedAmount });
    }
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Settings">
      <div className="space-y-4">
        <div>
          <FieldLabel>Current balance (Rp)</FieldLabel>
          <input
            inputMode="numeric"
            className={inputClass}
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Transfer day 1</FieldLabel>
            <input
              inputMode="numeric"
              className={inputClass}
              value={dayOne}
              onChange={(e) => setDayOne(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Transfer day 2</FieldLabel>
            <input
              inputMode="numeric"
              className={inputClass}
              value={dayTwo}
              onChange={(e) => setDayTwo(e.target.value)}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Amount per transfer (Rp)</FieldLabel>
          <input
            inputMode="numeric"
            className={inputClass}
            value={amountPerTransfer}
            onChange={(e) => setAmountPerTransfer(e.target.value)}
          />
        </div>

        <button
          onClick={handleSave}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-medium text-bg transition hover:bg-gold/90"
        >
          <Check size={18} />
          Save settings
        </button>
      </div>
    </BottomSheet>
  );
}
