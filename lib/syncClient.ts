"use client";

import { SyncCoordinator, type EnqueueInput } from "@/lib/syncCoordinator";
import {
  getAccessToken,
  getEdgeFunctionUrl,
  isSupabaseConfigured,
} from "@/lib/auth/supabaseClient";

// Singleton wiring between the Zustand store and the offline-first sync engine.
// Every persisted-slice mutation is mirrored into the coordinator's durable
// (localStorage-backed) queue and opportunistically flushed to a secure,
// authenticated remote endpoint.
//
// When Supabase is configured, sync targets the `sync-state` Edge Function,
// which upserts each authenticated user's snapshot into Postgres tables that
// mirror the local Zustand shapes 1:1 (RLS-scoped to auth.uid()). This moves
// the app from a local-only calculator to a durable multi-user product.

const SYNC_FUNCTION_NAME = "sync-state";
const QUEUE_STORAGE_KEY = "compass-sync-queue";
const SYNC_ENABLED = (process.env.NEXT_PUBLIC_SYNC_ENABLED ?? "").toLowerCase() === "true";

/** Resolve the remote sync endpoint: explicit override → Supabase function → none. */
function resolveSyncEndpoint(): string {
  const override = (process.env.NEXT_PUBLIC_SYNC_ENDPOINT ?? "").trim();
  if (override) return override;
  if (isSupabaseConfigured()) return getEdgeFunctionUrl(SYNC_FUNCTION_NAME);
  return "";
}

let coordinator: SyncCoordinator | null = null;

function shouldStartSync(): boolean {
  if (typeof window === "undefined") return false;
  if (!SYNC_ENABLED) return false;
  // A real, absolute remote endpoint is mandatory. Static/native (file://)
  // builds have no Next.js server, so a relative "/api/sync" would 404 — we
  // require an explicit https endpoint (Supabase function or override) instead.
  const endpoint = resolveSyncEndpoint();
  if (!endpoint || !/^https?:\/\//i.test(endpoint)) return false;
  return true;
}

/** Lazily create the client-only singleton coordinator. */
export function getSyncCoordinator(): SyncCoordinator | null {
  if (!shouldStartSync()) return null;
  if (!coordinator) {
    coordinator = new SyncCoordinator({
      endpoint: resolveSyncEndpoint(),
      storageKey: QUEUE_STORAGE_KEY,
      // Each flush carries the user's fresh Supabase JWT so the server can
      // scope the upsert to the authenticated user (RLS) and reject anonymous
      // writes with a fail-fast 4xx.
      authHeaderProvider: () => getAccessToken(),
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
    .catch(() => {
      // Failures stay in the durable queue and are retried by the
      // coordinator's polling loop + connectivity listeners.
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

  void c.syncNow().catch(() => {});

  store.subscribe((state, prev) => {
    // Mirror the FULL row payload (not just counts) so the remote Supabase
    // Postgres tables hold a durable, restorable 1:1 copy of the local state.
    // The `sync-state` Edge Function upserts each `kind` into its matching
    // table, scoped to the authenticated user via RLS (auth.uid()).
    if (state.balance !== prev.balance) {
      enqueueSync({ kind: "balance.update", payload: { id: "balance", value: state.balance } });
    }
    if (state.transactions !== prev.transactions) {
      enqueueSync({ kind: "transactions.replace", payload: { id: "transactions", rows: state.transactions } });
    }
    if (state.debts !== prev.debts) {
      enqueueSync({ kind: "debts.replace", payload: { id: "debts", rows: state.debts } });
    }
    if (state.savingsGoals !== prev.savingsGoals) {
      enqueueSync({ kind: "savingsGoals.replace", payload: { id: "savingsGoals", rows: state.savingsGoals } });
    }
    if (state.wishlist !== prev.wishlist) {
      enqueueSync({ kind: "wishlist.replace", payload: { id: "wishlist", rows: state.wishlist } });
    }
    if (state.notifications !== prev.notifications) {
      enqueueSync({ kind: "notifications.replace", payload: { id: "notifications", rows: state.notifications } });
    }
  });
}