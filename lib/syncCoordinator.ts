// lib/syncCoordinator.ts
// ---------------------------------------------------------------------------
// Compass Finance - Offline-to-Online Sync Coordinator
//
// Responsibilities:
//   1. Durable queue of pending offline mutations (PendingChange[]).
//   2. Strict connection-state machine: idle | syncing | offline | error.
//   3. Exponential backoff with FULL JITTER for transient failures
//      (5xx responses + pure network drops). Client errors (4xx) fail fast.
//   4. Batch flushing that drains the queue without polluting subsequent
//      connection states (items removed by stable change-id, never by index).
//   5. Single-flight de-duplication so polling + manual sync + the online
//      event handler can never trigger overlapping flushes.
//
// SSR-safe: every window / navigator access is guarded so the module is
// importable from Next.js server components without throwing.
// ---------------------------------------------------------------------------

export type SyncState = "idle" | "syncing" | "offline" | "error";

export interface SyncCoordinatorOptions {
  endpoint: string;
  pollIntervalMs?: number;
  retryBaseDelayMs?: number;
  retryMaxAttempts?: number;
  retryMaxDelayMs?: number;
  batchSize?: number;
  /** When set, the pending queue is dehydrated to localStorage under this key so
   *  offline mutations survive page reloads and crashes. Omit for pure in-memory. */
  storageKey?: string;
  /** Optional async provider of an Authorization header value (e.g. a Supabase
   *  JWT). Invoked per batch so the token is always fresh. Returning an empty
   *  string sends no Authorization header. */
  authHeaderProvider?: () => Promise<string> | string;
}

export interface ChangePayload {
  id: string;
  [key: string]: unknown;
}

export interface PendingChange {
  id: string;
  kind: string;
  payload: ChangePayload;
  createdAt: number;
  attempts: number;
}

export interface SyncStatus {
  state: SyncState;
  pendingCount: number;
  lastSyncedAt: number | null;
  consecutiveFailures: number;
}

export interface SyncResult {
  ok: boolean;
  accepted: number;
  rejected: number;
  attempts: number;
  rejectedIds?: string[];
  serverTime?: string;
  error?: string;
}

export interface EnqueueInput {
  kind: string;
  payload: ChangePayload;
}

export interface EnqueueAck {
  accepted: boolean;
  id: string;
}

interface ServerSyncResponse {
  accepted: number;
  rejected: number;
  rejectedIds?: string[];
  serverTime?: string;
}

interface BatchOutcome {
  ok: boolean;
  accepted: number;
  rejected: number;
  attempts: number;
  rejectedIds?: string[];
  serverTime?: string;
  error?: string;
  retryable: boolean;
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

const DEFAULTS = {
  pollIntervalMs: 60_000,
  retryBaseDelayMs: 1_000,
  retryMaxAttempts: 3,
  retryMaxDelayMs: 30_000,
  batchSize: 10,
} as const;

export class SyncCoordinator {
  public readonly instanceId: string;

  // Monotonic, process-wide counters guarantee unique ids even when the
  // system clock is frozen (e.g. vi.useFakeTimers) - this is what prevents
  // cross-test pollution and accidental double-flush of the same change.
  private static instanceCounter = 0;
  private static changeCounter = 0;

  private readonly endpoint: string;
  private readonly pollIntervalMs: number;
  private readonly retryBaseDelayMs: number;
  private readonly retryMaxAttempts: number;
  private readonly retryMaxDelayMs: number;
  private readonly batchSize: number;

  private readonly authHeaderProvider:
    | (() => Promise<string> | string)
    | null = null;

  private queue: PendingChange[] = [];
  private storageKey: string | null = null;
  private state: SyncState = "idle";
  private lastSyncedAt: number | null = null;
  private consecutiveFailures = 0;

  private online = true;
  private onlineWaiters: Array<() => void> = [];
  private inFlight: Promise<SyncResult> | null = null;
  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  constructor(options: SyncCoordinatorOptions) {
    if (!options || typeof options.endpoint !== "string" || options.endpoint.length === 0) {
      throw new Error("SyncCoordinator: a non-empty endpoint is required.");
    }

    this.endpoint = options.endpoint;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULTS.pollIntervalMs;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? DEFAULTS.retryBaseDelayMs;
    this.retryMaxAttempts = Math.max(1, options.retryMaxAttempts ?? DEFAULTS.retryMaxAttempts);
    this.retryMaxDelayMs = options.retryMaxDelayMs ?? DEFAULTS.retryMaxDelayMs;
    this.batchSize = Math.max(1, options.batchSize ?? DEFAULTS.batchSize);
    this.storageKey = options.storageKey ?? null;
    this.authHeaderProvider = options.authHeaderProvider ?? null;
    this.hydrateQueue();

    SyncCoordinator.instanceCounter += 1;
    this.instanceId = this.mintId("sync", SyncCoordinator.instanceCounter);

    this.online = this.readNavigatorOnline();

    this.attachConnectionListeners();
    this.startPolling();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  public getStatus(): SyncStatus {
    return {
      state: this.state,
      pendingCount: this.queue.length,
      lastSyncedAt: this.lastSyncedAt,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  public getPendingChanges(): PendingChange[] {
    // Defensive copy so callers cannot mutate internal queue state.
    return this.queue.map((change) => ({ ...change, payload: { ...change.payload } }));
  }

  public async enqueue(input: EnqueueInput): Promise<EnqueueAck> {
    const payload = input ? input.payload : undefined;
    if (!payload || typeof payload.id !== "string" || payload.id.length === 0) {
      throw new Error("SyncCoordinator.enqueue: payload.id is required and must be a non-empty string.");
    }

    SyncCoordinator.changeCounter += 1;
    const change: PendingChange = {
      id: this.mintId("chg", SyncCoordinator.changeCounter),
      kind: input.kind,
      payload,
      createdAt: Date.now(),
      attempts: 0,
    };

    this.queue.push(change);
    this.persistQueue();
    return { accepted: true, id: payload.id };
  }

  public async syncNow(): Promise<SyncResult> {
    // Single-flight: collapse concurrent callers onto one in-flight run.
    if (this.inFlight) {
      return this.inFlight;
    }
    const run = this.runSync();
    this.inFlight = run;
    try {
      return await run;
    } finally {
      this.inFlight = null;
    }
  }

  public stop(): void {
    this.disposed = true;
    this.stopPolling();
    this.detachConnectionListeners();
    this.onlineWaiters = [];
  }

  // -------------------------------------------------------------------------
  // Orchestration
  // -------------------------------------------------------------------------

  private async runSync(): Promise<SyncResult> {
    if (this.queue.length === 0) {
      if (this.state !== "syncing") this.state = "idle";
      return { ok: true, accepted: 0, rejected: 0, attempts: 0 };
    }

    // Connection-state awareness: park here until the device is online.
    if (!this.isOnline()) {
      this.state = "offline";
      await this.waitForOnline();
    }

    return this.flushQueue();
  }

  private async flushQueue(): Promise<SyncResult> {
    this.state = "syncing";

    let totalAccepted = 0;
    let totalRejected = 0;
    let totalAttempts = 0;
    const rejectedIds: string[] = [];
    let serverTime: string | undefined;

    while (this.queue.length > 0) {
      // Re-check connectivity between batches: a drop mid-flush parks the
      // coordinator instead of burning retries against a dead network.
      if (!this.isOnline()) {
        this.state = "offline";
        await this.waitForOnline();
        this.state = "syncing";
      }

      const batch = this.queue.slice(0, this.batchSize);
      const outcome = await this.sendBatchWithRetry(batch);
      totalAttempts += outcome.attempts;

      if (!outcome.ok) {
        this.consecutiveFailures += 1;
        this.state = "error";
        return {
          ok: false,
          accepted: totalAccepted,
          rejected: totalRejected,
          attempts: totalAttempts,
          rejectedIds: rejectedIds.length > 0 ? rejectedIds : undefined,
          error: outcome.error,
        };
      }

      // Pollution prevention: remove exactly the flushed items by stable id.
      // Anything enqueued during the awaited round-trip survives untouched.
      const sentIds = new Set(batch.map((change) => change.id));
      this.queue = this.queue.filter((change) => !sentIds.has(change.id));
      this.persistQueue();

      totalAccepted += outcome.accepted;
      totalRejected += outcome.rejected;
      if (outcome.rejectedIds) rejectedIds.push(...outcome.rejectedIds);
      if (outcome.serverTime) serverTime = outcome.serverTime;

      this.lastSyncedAt = Date.now();
      this.consecutiveFailures = 0;
    }

    this.state = "idle";
    return {
      ok: true,
      accepted: totalAccepted,
      rejected: totalRejected,
      attempts: totalAttempts,
      rejectedIds: rejectedIds.length > 0 ? rejectedIds : undefined,
      serverTime,
    };
  }

  private async sendBatchWithRetry(batch: PendingChange[]): Promise<BatchOutcome> {
    let attempt = 0;
    let lastError = "Sync failed.";

    while (attempt < this.retryMaxAttempts) {
      attempt += 1;
      for (const change of batch) change.attempts = attempt;

      const outcome = await this.transmitBatch(batch, attempt);

      // Success, or a non-retryable client error (4xx) -> stop immediately.
      if (outcome.ok || !outcome.retryable) {
        return outcome;
      }

      lastError = outcome.error ?? lastError;

      // Retryable (5xx / network). Back off unless attempts are exhausted.
      if (attempt >= this.retryMaxAttempts) break;
      await this.backoffDelay(attempt);
    }

    return {
      ok: false,
      accepted: 0,
      rejected: 0,
      attempts: attempt,
      error: lastError,
      retryable: true,
    };
  }

  private async transmitBatch(batch: PendingChange[], attempt: number): Promise<BatchOutcome> {
    const fetchFn = this.resolveFetch();
    const body = JSON.stringify({
      instanceId: this.instanceId,
      sentAt: Date.now(),
      changes: batch,
    });

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      // Attach a fresh auth token (e.g. Supabase JWT) per batch when provided.
      if (this.authHeaderProvider) {
        try {
          const auth = await this.authHeaderProvider();
          if (auth) headers["Authorization"] = `Bearer ${auth}`;
        } catch {
          // Token resolution failed — proceed unauthenticated; the server will
          // reject with a 4xx (fail-fast) if auth is mandatory.
        }
      }

      const response = await fetchFn(this.endpoint, {
        method: "POST",
        headers,
        body,
      });

      if (response.ok) {
        const data = await this.parseResponse(response);
        return {
          ok: true,
          accepted: data.accepted,
          rejected: data.rejected,
          rejectedIds: data.rejectedIds,
          serverTime: data.serverTime,
          attempts: attempt,
          retryable: false,
        };
      }

      // Client error (4xx): deterministic fail-fast, never retried.
      if (response.status >= 400 && response.status < 500) {
        return {
          ok: false,
          accepted: 0,
          rejected: 0,
          attempts: attempt,
          error: "Server rejected the batch with client error " + String(response.status) + ".",
          retryable: false,
        };
      }

      // Server error (5xx) or any other non-ok status: retryable.
      return {
        ok: false,
        accepted: 0,
        rejected: 0,
        attempts: attempt,
        error: "Server error " + String(response.status) + ".",
        retryable: true,
      };
    } catch (error) {
      // Pure network failure (fetch rejected): retryable.
      return {
        ok: false,
        accepted: 0,
        rejected: 0,
        attempts: attempt,
        error: this.describeError(error),
        retryable: true,
      };
    }
  }

  private async parseResponse(response: Response): Promise<ServerSyncResponse> {
    try {
      const data = (await response.json()) as Partial<ServerSyncResponse> | null;
      const rejectedIds =
        data && Array.isArray(data.rejectedIds) ? (data.rejectedIds as string[]) : undefined;
      return {
        accepted: data && typeof data.accepted === "number" ? data.accepted : 0,
        rejected: data && typeof data.rejected === "number" ? data.rejected : 0,
        rejectedIds,
        serverTime: data && typeof data.serverTime === "string" ? data.serverTime : undefined,
      };
    } catch {
      return { accepted: 0, rejected: 0 };
    }
  }

  // -------------------------------------------------------------------------
  // Backoff with full jitter
  // -------------------------------------------------------------------------

  private backoffDelay(attempt: number): Promise<void> {
    // Full jitter (AWS pattern): delay drawn uniformly from [0, cap), where
    // cap = min(maxDelay, base * 2^(attempt-1)). Bounding by the cap is what
    // keeps deterministic fake-timer advances able to flush every retry.
    const exponential = this.retryBaseDelayMs * Math.pow(2, attempt - 1);
    const cap = Math.min(this.retryMaxDelayMs, exponential);
    const jittered = Math.random() * cap;
    return new Promise<void>((resolve) => {
      setTimeout(resolve, jittered);
    });
  }

  // -------------------------------------------------------------------------
  // Connection awareness
  // -------------------------------------------------------------------------

  private isOnline(): boolean {
    const navOnline = this.readNavigatorOnlineOrNull();
    if (navOnline !== null) return navOnline;
    return this.online;
  }

  private readNavigatorOnline(): boolean {
    const value = this.readNavigatorOnlineOrNull();
    return value === null ? true : value;
  }

  private readNavigatorOnlineOrNull(): boolean | null {
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return navigator.onLine;
    }
    return null;
  }

  private waitForOnline(): Promise<void> {
    if (this.isOnline()) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.onlineWaiters.push(resolve);
    });
  }

  private handleOnline = (): void => {
    this.online = true;

    const waiters = this.onlineWaiters;
    this.onlineWaiters = [];
    for (const resolve of waiters) resolve();

    if (this.state === "offline") {
      this.state = this.queue.length > 0 ? "syncing" : "idle";
    }

    // Auto-flush only when nobody is already awaiting a sync, so we never
    // double-fetch the same queued batch on reconnect.
    if (waiters.length === 0 && !this.inFlight && this.queue.length > 0 && !this.disposed) {
      void this.syncNow();
    }
  };

  private handleOffline = (): void => {
    this.online = false;
    if (!this.inFlight) this.state = "offline";
  };

  private attachConnectionListeners(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  private detachConnectionListeners(): void {
    if (typeof window === "undefined") return;
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
  }

  // -------------------------------------------------------------------------
  // Background polling
  // -------------------------------------------------------------------------

  private startPolling(): void {
    if (this.pollIntervalMs <= 0) return;
    if (typeof setInterval !== "function") return;
    this.pollHandle = setInterval(() => {
      if (this.disposed) return;
      if (this.inFlight) return;
      if (this.queue.length === 0) return;
      if (!this.isOnline()) return;
      void this.syncNow();
    }, this.pollIntervalMs);
  }

  private stopPolling(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private resolveFetch(): FetchLike {
    const globalAny = globalThis as unknown as { fetch?: FetchLike };
    const fetchFn = globalAny.fetch;
    if (typeof fetchFn !== "function") {
      throw new Error("SyncCoordinator: global fetch is not available in this environment.");
    }
    return fetchFn;
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Unknown network error.";
  }

  private getStorage(): Storage | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage;
      }
    } catch {
      // localStorage can throw in privacy/sandboxed contexts.
    }
    return null;
  }

  /** Rehydrate the pending queue from durable storage (no-op unless storageKey set). */
  private hydrateQueue(): void {
    if (!this.storageKey) return;
    const storage = this.getStorage();
    if (!storage) return;
    try {
      const raw = storage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.queue = parsed.filter(
          (c) =>
            c &&
            typeof c.id === "string" &&
            typeof c.kind === "string" &&
            c.payload &&
            typeof c.payload.id === "string"
        ) as PendingChange[];
      }
    } catch {
      // Corrupt payload — start clean rather than crash the app.
    }
  }

  /** Dehydrate the pending queue to durable storage (no-op unless storageKey set). */
  private persistQueue(): void {
    if (!this.storageKey) return;
    const storage = this.getStorage();
    if (!storage) return;
    try {
      storage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch {
      // Quota exceeded or serialization failure — non-fatal for the in-memory path.
    }
  }

  private mintId(prefix: string, counter: number): string {
    const time = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    return prefix + "-" + time + "-" + counter.toString(36) + "-" + rand;
  }
}

export default SyncCoordinator;