"use client";

import { Card } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { formatNumberID } from "@/lib/utils/currency";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

interface StatTileProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: "gold" | "emerald" | "coral" | "default";
  isCurrency?: boolean;
  suffix?: string;
  onClick?: () => void;
}

const ACCENT_CLASSES: Record<NonNullable<StatTileProps["accent"]>, string> = {
  gold: "text-gold",
  emerald: "text-emerald",
  coral: "text-coral",
  default: "text-ink",
};

export function StatTile({
  label,
  value,
  icon: Icon,
  accent = "default",
  isCurrency = true,
  suffix = "",
  onClick,
}: StatTileProps) {
  return (
    <Card
      onClick={onClick}
      className={clsx("flex flex-col gap-2", onClick && "cursor-pointer transition hover:border-gold/30")}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</span>
        <Icon size={16} className="text-ink-faint" />
      </div>
      <span className={clsx("font-display text-xl font-semibold", ACCENT_CLASSES[accent])}>
        <AnimatedNumber
          value={value}
          format={(v) => (isCurrency ? `Rp${formatNumberID(v)}` : `${Math.round(v)}${suffix}`)}
        />
      </span>
    </Card>
  );
}
