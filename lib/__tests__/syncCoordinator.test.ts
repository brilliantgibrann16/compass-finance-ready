// lib/__tests__/syncCoordinator.test.ts
// ---------------------------------------------------------------------------
// Unit test untuk modul sinkronisasi data finansial Compass Finance.
//
// Modul yang diuji: `lib/syncCoordinator.ts`
// Strategi anti clock-dependent assertion:
// 1. SEMUA test yang melibatkan waktu WAJIB pakai `vi.useFakeTimers()`.
// 2. Waktu eksplisit di-set dengan `vi.setSystemTime()` di awal tiap test.
// ---------------------------------------------------------------------------

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SyncCoordinator,
  type PendingChange,
  type SyncStatus,
} from "../syncCoordinator";

// ---------------------------------------------------------------------------
// Mock: fetch global
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

// Mock event emitter untuk online/offline
const fireOnline = () => {
  Object.defineProperty(navigator, "onLine", {
    value: true,
    configurable: true,
    writable: true,
  });
  window.dispatchEvent(new Event("online"));
};

const fireOffline = () => {
  Object.defineProperty(navigator, "onLine", {
    value: false,
    configurable: true,
    writable: true,
  });
  window.dispatchEvent(new Event("offline"));
};

// Fixtures — data finansial sesuai blueprint v10.md (Section 3)
const buildDebtEntry = (overrides = {}) => ({
  id: "debt_gopay_jul26",
  provider: "GoPay Pinjam",
  outstanding: 1_075_283,
  dueDate: "2026-07-25",
  priority: 1,
  status: "active",
  ...overrides,
});

const mockResponse = <T>(body: T, init: ResponseInit = { status: 200 }) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers as object) },
    })
  );

const mockNetworkError = () => Promise.reject(new TypeError("Failed to fetch"));

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe("SyncCoordinator", () => {
  let coordinator: SyncCoordinator;
  const BASE_TIME = new Date("2026-07-01T00:00:00.000Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
    mockFetch.mockReset();

    coordinator = new SyncCoordinator({
      endpoint: "https://api.compass.local/sync",
      pollIntervalMs: 60_000,
      retryBaseDelayMs: 1_000,
      retryMaxAttempts: 3,
      batchSize: 10,
    });
  });

  afterEach(() => {
    coordinator.stop();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("memulai dengan status idle dan queue kosong", () => {
      const status: SyncStatus = coordinator.getStatus();
      expect(status.state).toBe("idle");
      expect(status.pendingCount).toBe(0);
      expect(status.lastSyncedAt).toBeNull();
      expect(status.consecutiveFailures).toBe(0);
    });

    it("menghasilkan instanceId unik", () => {
      const other = new SyncCoordinator({ endpoint: "https://api.compass.local/sync" });
      expect(coordinator.instanceId).not.toBe(other.instanceId);
      other.stop();
    });
  });

  describe("enqueue()", () => {
    it("menerima DebtEntry dan menambah pendingCount", async () => {
      const debt = buildDebtEntry();
      const ack = await coordinator.enqueue({ kind: "debt.upsert", payload: debt });
      expect(ack.accepted).toBe(true);
      expect(coordinator.getStatus().pendingCount).toBe(1);
    });

    it("menolak payload yang tidak memiliki id", async () => {
      await expect(
        coordinator.enqueue({
          kind: "debt.upsert",
          // @ts-expect-error - testing invalid runtime payload
          payload: { provider: "GoPay Pinjam" },
        })
      ).rejects.toThrow();
    });

    it("mencatat createdAt secara dinamis", async () => {
      const ADVANCE_MS = 5 * 60 * 60 * 1000;
      vi.advanceTimersByTime(ADVANCE_MS);
      const expectedCreatedAt = BASE_TIME + ADVANCE_MS;

      await coordinator.enqueue({
        kind: "debt.upsert",
        payload: buildDebtEntry({ id: "debt_test_ts" }),
      });

      const pending: PendingChange[] = coordinator.getPendingChanges();
      expect(pending[0].createdAt).toBe(expectedCreatedAt);
    });
  });

  describe("syncNow() — success path", () => {
    it("mengirim batch perubahan dan memperbarui lastSyncedAt", async () => {
      await coordinator.enqueue({ kind: "debt.upsert", payload: buildDebtEntry() });
      mockFetch.mockResolvedValueOnce(mockResponse({ accepted: 1, rejected: 0 }));

      const before = Date.now();
      await coordinator.syncNow();
      const after = Date.now();

      const status = coordinator.getStatus();
      expect(status.lastSyncedAt).not.toBeNull();
      expect(status.lastSyncedAt!).toBeGreaterThanOrEqual(before);
      expect(status.lastSyncedAt!).toBeLessThanOrEqual(after);
    });
  });

  describe("syncNow() — network failure & retry", () => {
    it("melakukan exponential backoff dan menyerah setelah retryMaxAttempts", async () => {
      mockFetch.mockImplementation(mockNetworkError);
      await coordinator.enqueue({ kind: "debt.upsert", payload: buildDebtEntry() });

      const syncPromise = coordinator.syncNow();
      await vi.advanceTimersByTimeAsync(1_000);
      await vi.advanceTimersByTimeAsync(2_000);
      await syncPromise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(coordinator.getStatus().state).toBe("error");
    });
  });

  describe("online / offline awareness", () => {
    it("menunda sync saat offline dan memflush saat kembali online", async () => {
      fireOffline();
      await coordinator.enqueue({ kind: "debt.upsert", payload: buildDebtEntry() });

      const syncPromise = coordinator.syncNow();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(mockFetch).not.toHaveBeenCalled();

      // Reset total mock history untuk menghancurkan sisa call polling dari suite tes lain
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce(mockResponse({ accepted: 1, rejected: 0 }));

      fireOnline();
      await syncPromise;

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("meng-handle GoPay Pinjam upsert dengan nominal besar sesuai blueprint v10", async () => {
      const gopayAgustus = buildDebtEntry({
        id: "debt_gopay_aug26",
        provider: "GoPay Pinjam",
        outstanding: 1_937_350, // Nominal krusial Agustus
      });

      mockFetch.mockResolvedValueOnce(mockResponse({ accepted: 1, rejected: 0 }));
      await coordinator.enqueue({ kind: "debt.upsert", payload: gopayAgustus });
      await coordinator.syncNow();

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(sentBody.changes[0].payload.outstanding).toBe(1_937_350);
    });
  });
});