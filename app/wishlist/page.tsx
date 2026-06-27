"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { PageLayout } from "@/components/ui/PageLayout";
import { WishlistItemCard } from "@/components/wishlist/WishlistItemCard";
import { WishlistFormSheet } from "@/components/wishlist/WishlistFormSheet";
import type { WishlistItem } from "@/lib/types";
import { Plus, Sparkle } from "lucide-react";

export default function WishlistPage() {
  const hydrated = useHydrated();
  const wishlist = useAppStore((s) => s.wishlist);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

  if (!hydrated) return <LoadingScreen />;

  function openAddForm() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEditForm(item: WishlistItem) {
    setEditingItem(item);
    setFormOpen(true);
  }

  return (
    <PageLayout title="Wishlist" subtitle="Things you're saving up for">

      {wishlist.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl2 border border-dashed border-border-soft py-12 text-center">
          <Sparkle size={28} className="text-ink-faint" />
          <p className="mt-3 text-sm text-ink-muted">Nothing on your wishlist yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wishlist.map((item) => (
            <WishlistItemCard key={item.id} item={item} onEdit={() => openEditForm(item)} />
          ))}
        </div>
      )}

      <button
        onClick={openAddForm}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-soft py-3 font-medium text-ink-muted transition hover:border-gold/40 hover:text-gold"
      >
        <Plus size={18} />
        Add to wishlist
      </button>

      <WishlistFormSheet open={formOpen} onClose={() => setFormOpen(false)} editingItem={editingItem} />
    </PageLayout>
  );
}
