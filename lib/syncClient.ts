"use client";

import { SyncCoordinator, type EnqueueInput } from "@/lib/syncCoordinator";

// Singleton wiring between the Zustand store and the offline-first sync engine.
// Every persisted-slice mutation is mirrored into the coordinator's durable
// (localStorage-backed) queue and opportunistically flushed to the sync API.

const SYNC_ENDPOINT =
  (process.env.NEXT_PUBLIC_SYNC_ENDPOINT ?? "").trim() || "/api/sync";
const QUEUE_STORAGE_KEY = "compass-sync-queue";
const SYNC_ENABLED = (process.env.NEXT_PUBLIC_SYNC_ENABLED ?? "").toLowerCase() === "true";

let coordinator: SyncCoordinator | null = null;

function isNativeStaticExport(): boolean {
  if (typeof window === "undefined") return false;
  const capacitor = (window as typeof window & { Capacitor?: unknown }).Capacitor;
  return window.location.protocol === "file:" || typeof capacitor !== "undefined";
}

function shouldStartSync(): boolean {
  if (typeof window === "undefined") return false;
  if (!SYNC_ENABLED) return false;
  if (isNativeStaticExport() && SYNC_ENDPOINT === "/api/sync") return false;
  return true;
}

/** Lazily create the client-only singleton coordinator. */
export function getSyncCoordinator(): SyncCoordinator | null {
  if (!shouldStartSync()) return null;
  if (!coordinator) {
    coordinator = new SyncCoordinator({
      endpoint: SYNC_ENDPOINT,
      storageKey: QUEUE_STORAGE_KEY,
    });
  }
  return coordinator;
}

/** Enqueue a mutation durably, then opportunistically flush to the server. */
export function enqueueSync(input: EnqueueInput): void {
  if (!shouldStartSync()) return;
  const c = getSyncCoordinator();
  if (!c) return;
  void c
    .enqueue(input)
    .then(() => c.syncNow())
    .catch((err: unknown) => {
      // Failures stay in the durable queue and are retried by the
      // coordinator's polling loop + connectivity listeners.
      console.warn("[SyncClient] enqueueSync failed, will retry:", err instanceof Error ? err.message : err);
    });
}

interface SyncableState {
  balance: number;
  transactions: unknown[];
  debts: unknown[];
  savingsGoals: unknown[];
  wishlist: unknown[];
  notifications: unknown[];
}

interface SubscribableStore {
  getState: () => SyncableState;
  subscribe: (
    listener: (state: SyncableState, prev: SyncableState) => void
  ) => () => void;
}

let started = false;

/**
 * Boot the sync loop on the client: flush anything persisted from a previous
 * session, then mirror each persisted-slice change into the durable queue.
 */
export function startSync(store: SubscribableStore): void {
  if (!shouldStartSync() || started) return;
  const c = getSyncCoordinator();
  if (!c) return;
  started = true;

  void c.syncNow().catch((err: unknown) => {
    console.warn("[SyncClient] initial sync flush failed, will retry:", err instanceof Error ? err.message : err);
  });

  store.subscribe((state, prev) => {
    if (state.balance !== prev.balance) {
      enqueueSync({ kind: "balance.update", payload: { id: "balance", value: state.balance } });
    }
    if (state.transactions !== prev.transactions) {
      enqueueSync({ kind: "transactions.replace", payload: { id: "transactions", count: state.transactions.length } });
    }
    if (state.debts !== prev.debts) {
      enqueueSync({ kind: "debts.replace", payload: { id: "debts", count: state.debts.length } });
    }
    if (state.savingsGoals !== prev.savingsGoals) {
      enqueueSync({ kind: "savingsGoals.replace", payload: { id: "savingsGoals", count: state.savingsGoals.length } });
    }
    if (state.wishlist !== prev.wishlist) {
      enqueueSync({ kind: "wishlist.replace", payload: { id: "wishlist", count: state.wishlist.length } });
    }
    if (state.notifications !== prev.notifications) {
      enqueueSync({ kind: "notifications.replace", payload: { id: "notifications", count: state.notifications.length } });
    }
  });
}