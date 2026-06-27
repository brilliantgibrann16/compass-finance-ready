"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatRupiahCompact } from "@/lib/utils/currency";
import type { WishlistItem } from "@/lib/types";
import { Sparkle } from "lucide-react";

export function WishlistTeaser({ items }: { items: WishlistItem[] }) {
  const totalSaved = items.reduce((sum, i) => sum + i.savedAmount, 0);
  const totalTarget = items.reduce((sum, i) => sum + i.targetAmount, 0);

  return (
    <Link href="/wishlist">
      <Card className="cursor-pointer transition hover:border-gold/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkle size={18} className="text-gold" />
            <span className="font-medium text-ink">Wishlist</span>
          </div>
          <span className="text-sm text-ink-muted">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </div>
        {items.length > 0 && (
          <p className="mt-2 text-sm text-ink-faint">
            {formatRupiahCompact(totalSaved)} saved of {formatRupiahCompact(totalTarget)}
          </p>
        )}
      </Card>
    </Link>
  );
}
