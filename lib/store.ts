"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AppData,
  AppNotification,
  CategoryId,
  ReceiptItem,
  Transaction,
  TransferSettings,
  WishlistItem,
} from "@/lib/types";
import { SEED_DATA } from "@/lib/seedData";
import { startSync } from "@/lib/syncClient";

interface AppActions {
  addTransaction: (input: {
    amount: number;
    kind: "expense" | "income";
    category: CategoryId;
    merchant?: string;
    note?: string;
    source: Transaction["source"];
    date?: string;
    receiptImageUrl?: string;
    items?: ReceiptItem[];
  }) => void;
  deleteTransaction: (id: string) => void;
  setBalance: (balance: number) => void;
  updateTransferSettings: (settings: Partial<TransferSettings>) => void;
  toggleInstallmentPaid: (debtId: string, installmentId: string) => void;
  contributeToGoal: (id: string, amount: number) => void;
  contributeToWishlist: (id: string, amount: number) => void;
  addWishlistItem: (
    item: Omit<WishlistItem, "id" | "createdAt" | "achievedAt">
  ) => void;
  updateWishlistItem: (
    id: string,
    patch: Partial<Omit<WishlistItem, "id" | "createdAt">>
  ) => void;
  deleteWishlistItem: (id: string) => void;
  addNotification: (notification: Omit<AppNotification, "id" | "isRead">) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  dismissNotification: (id: string) => void;
  resetToSeedData: () => void;
}

export type AppStore = AppData & AppActions;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const STORE_VERSION = 5;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...SEED_DATA,

      addTransaction: (input) =>
        set((state) => {
          const transaction: Transaction = {
            id: generateId(),
            amount: input.amount,
            kind: input.kind,
            category: input.category,
            merchant: input.merchant,
            note: input.note,
            date: input.date ?? new Date().toISOString().slice(0, 10),
            source: input.source,
            receiptImageUrl: input.receiptImageUrl,
            items: input.items,
            createdAt: new Date().toISOString(),
          };
          const balanceDelta = input.kind === "expense" ? -input.amount : input.amount;
          return {
            transactions: [transaction, ...state.transactions],
            balance: state.balance + balanceDelta,
          };
        }),

      deleteTransaction: (id) =>
        set((state) => {
          const tx = state.transactions.find((t) => t.id === id);
          if (!tx) return state;
          const balanceDelta = tx.kind === "expense" ? tx.amount : -tx.amount;
          return {
            transactions: state.transactions.filter((t) => t.id !== id),
            balance: state.balance + balanceDelta,
          };
        }),

      setBalance: (balance) => set({ balance }),

      updateTransferSettings: (settings) =>
        set((state) => ({
          transferSettings: { ...state.transferSettings, ...settings },
        })),

      toggleInstallmentPaid: (debtId, installmentId) =>
        set((state) => ({
          debts: state.debts.map((debt) => {
            if (debt.id !== debtId) return debt;
            return {
              ...debt,
              installments: debt.installments.map((installment) => {
                if (installment.id !== installmentId) return installment;
                const isPaid = !installment.isPaid;
                return {
                  ...installment,
                  isPaid,
                  paidAt: isPaid ? new Date().toISOString() : undefined,
                };
              }),
            };
          }),
        })),

      contributeToGoal: (id, amount) =>
        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) =>
            g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g
          ),
          balance: state.balance - amount,
        })),

      contributeToWishlist: (id, amount) =>
        set((state) => ({
          wishlist: state.wishlist.map((w) =>
            w.id === id ? { ...w, savedAmount: w.savedAmount + amount } : w
          ),
          balance: state.balance - amount,
        })),

      addWishlistItem: (item) =>
        set((state) => ({
          wishlist: [
            ...state.wishlist,
            { ...item, id: generateId(), createdAt: new Date().toISOString() },
          ],
        })),

      updateWishlistItem: (id, patch) =>
        set((state) => ({
          wishlist: state.wishlist.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),

      deleteWishlistItem: (id) =>
        set((state) => ({
          wishlist: state.wishlist.filter((w) => w.id !== id),
        })),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            { ...notification, id: generateId(), isRead: false },
            ...state.notifications,
          ],
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        })),

      clearNotifications: () => set({ notifications: [] }),

      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      resetToSeedData: () => set(SEED_DATA),
    }),
    {
      name: "compass-finance-data",
      storage: createJSONStorage(() => localStorage),
      // Swap `storage` for a Supabase-backed implementation of
      // { getItem, setItem, removeItem } when V2 lands — nothing
      // else in the app touches localStorage directly.
      version: STORE_VERSION,
      migrate: (persistedState, persistedVersion) => {
        const state = persistedState as AppData;
        if (persistedVersion < 4) {
          return { ...SEED_DATA };
        }
        if (persistedVersion < 5) {
          // v5: Add frequency field to transferSettings
          return {
            ...state,
            transferSettings: {
              ...state.transferSettings,
              frequency: "monthly" as const,
            },
          };
        }
        return state;
      },
    }
  )
);

// ---------------------------------------------------------------------------
// Offline-first sync wiring (client-only). Boots the durable SyncCoordinator
// and mirrors every persisted-slice mutation into its queue so edits survive
// reloads/crashes and flush to /api/sync.
// ---------------------------------------------------------------------------
if (typeof window !== "undefined") {
  startSync(useAppStore);
}
