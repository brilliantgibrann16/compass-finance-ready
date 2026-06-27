"use client";

import {
  UtensilsCrossed,
  Droplets,
  Sparkles,
  ShoppingBag,
  Bike,
  Receipt,
  HeartPulse,
  Tv,
  PiggyBank,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "@/lib/types";
import { CATEGORIES } from "@/lib/engine/categoryDetector";

/**
 * Static map instead of dynamic lookup-by-string-name — keeps icons
 * tree-shakeable and avoids relying on lucide's internal export keys
 * matching our CategoryId.icon strings at runtime.
 */
const ICONS: Record<CategoryId, LucideIcon> = {
  food: UtensilsCrossed,
  water: Droplets,
  grooming: Sparkles,
  shopping: ShoppingBag,
  transport: Bike,
  bills: Receipt,
  health: HeartPulse,
  entertainment: Tv,
  savings: PiggyBank,
  other: CircleDashed,
};

export function CategoryIcon({ category, size = 16 }: { category: CategoryId; size?: number }) {
  const Icon = ICONS[category];
  const color = CATEGORIES[category].color;
  return <Icon size={size} style={{ color }} />;
}

export function CategoryBadge({ category }: { category: CategoryId }) {
  const meta = CATEGORIES[category];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
    >
      <CategoryIcon category={category} size={12} />
      {meta.label}
    </span>
  );
}
