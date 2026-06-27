"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { formatNumberID } from "@/lib/utils/currency";
import { Settings } from "lucide-react";
import { RealtimeClock } from "@/components/ui/RealtimeClock";
import { useTranslation } from "@/lib/i18n/LanguageContext";

function getGreeting(hour: number, t: (key: string) => string): string {
  if (hour < 11) return t("greetingMorning");
  if (hour < 15) return t("greetingAfternoon");
  if (hour < 19) return t("greetingEvening");
  return t("greetingNight");
}

export function DashboardHeader({
  balance,
  onSettingsClick,
}: {
  balance: number;
  onSettingsClick: () => void;
}) {
  const { t } = useTranslation();
  const greeting = getGreeting(new Date().getHours(), t as (key: string) => string);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start justify-between"
    >
      <div>
        <BrandLogo size="md" className="mb-2" />
        <p className="text-sm text-ink-muted">{greeting}</p>
        <div className="mt-1 mb-1.5">
          <RealtimeClock />
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
          {t("availableBalance")}
        </p>
        <p className="mt-1 font-display text-4xl font-semibold text-ink">
          <AnimatedNumber value={balance} format={(v) => `Rp${formatNumberID(v)}`} />
        </p>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={onSettingsClick}
          aria-label={t("settings")}
          className="rounded-full border border-border-soft p-2.5 text-ink-muted transition hover:border-gold/30 hover:text-gold"
        >
          <Settings size={18} />
        </button>
      </div>
    </motion.div>
  );
}
