"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import type { IncomeFrequency } from "@/lib/types";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-ink-muted">{children}</label>;
}

const inputClass =
  "w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 font-mono text-ink focus:border-gold focus:outline-none";

const FREQUENCIES: IncomeFrequency[] = ["weekly", "biweekly", "monthly", "custom"];

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const { t } = useTranslation();
  const balance = useAppStore((s) => s.balance);
  const transferSettings = useAppStore((s) => s.transferSettings);
  const setBalance = useAppStore((s) => s.setBalance);
  const updateTransferSettings = useAppStore((s) => s.updateTransferSettings);

  const [balanceInput, setBalanceInput] = useState(String(balance));
  const [dayOne, setDayOne] = useState(String(transferSettings.dayOne));
  const [dayTwo, setDayTwo] = useState(String(transferSettings.dayTwo));
  const [amountPerTransfer, setAmountPerTransfer] = useState(String(transferSettings.amountPerTransfer));
  const [frequency, setFrequency] = useState<IncomeFrequency>(transferSettings.frequency || "monthly");
  const [customInterval, setCustomInterval] = useState(String(transferSettings.customIntervalDays || 30));

  const FREQ_LABELS: Record<IncomeFrequency, string> = {
    weekly: t("weekly"),
    biweekly: t("biweekly"),
    monthly: t("monthly"),
    custom: t("custom"),
  };

  function handleSave() {
    const parsedBalance = parseInt(balanceInput.replace(/\D/g, ""), 10);
    const parsedDayOne = parseInt(dayOne, 10);
    const parsedDayTwo = parseInt(dayTwo, 10);
    const parsedAmount = parseInt(amountPerTransfer.replace(/\D/g, ""), 10);
    const parsedInterval = parseInt(customInterval, 10);

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
    updateTransferSettings({
      frequency,
      customIntervalDays: frequency === "custom" && Number.isFinite(parsedInterval) ? parsedInterval : undefined,
    });
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t("settings")}>
      <div className="space-y-4">
        <div>
          <FieldLabel>{t("currentBalance")} (Rp)</FieldLabel>
          <input
            inputMode="numeric"
            className={inputClass}
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
          />
        </div>

        {/* Income Frequency Selector */}
        <div>
          <FieldLabel>{t("incomeFrequency")}</FieldLabel>
          <div className="flex gap-2">
            {FREQUENCIES.map((freq) => (
              <button
                key={freq}
                onClick={() => setFrequency(freq)}
                className={clsx(
                  "flex-1 rounded-xl border py-2 text-xs font-medium transition",
                  frequency === freq
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border-soft text-ink-muted hover:border-border"
                )}
              >
                {FREQ_LABELS[freq]}
              </button>
            ))}
          </div>
        </div>

        {/* Custom interval field */}
        {frequency === "custom" && (
          <div>
            <FieldLabel>{t("customIntervalDays")}</FieldLabel>
            <input
              inputMode="numeric"
              className={inputClass}
              value={customInterval}
              onChange={(e) => setCustomInterval(e.target.value)}
            />
          </div>
        )}

        {/* Transfer day fields only shown for monthly/biweekly */}
        {(frequency === "monthly" || frequency === "biweekly") && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>{t("transferDay1")}</FieldLabel>
              <input
                inputMode="numeric"
                className={inputClass}
                value={dayOne}
                onChange={(e) => setDayOne(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>{t("transferDay2")}</FieldLabel>
              <input
                inputMode="numeric"
                className={inputClass}
                value={dayTwo}
                onChange={(e) => setDayTwo(e.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <FieldLabel>{t("amountPerTransfer")} (Rp)</FieldLabel>
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
          {t("saveSettings")}
        </button>
      </div>
    </BottomSheet>
  );
}
