// lib/engine/__tests__/transferCycle.test.ts
import { describe, it, expect } from "vitest";
import { getCurrentCycle } from "../transferCycle";
import type { TransferSettings } from "../../types";

// ── Fixtures ──────────────────────────────────────────────────────────
const defaultSettings: TransferSettings = {
  balance: 750_000,
  dayOne: 1,
  dayTwo: 15,
  amountPerTransfer: 750_000,
};

// ── Tests ─────────────────────────────────────────────────────────────

describe("getCurrentCycle", () => {
  it("returns first-half cycle when between dayOne and dayTwo", () => {
    const today = new Date("2026-06-10");
    const cycle = getCurrentCycle(today, defaultSettings);
    expect(cycle.cycleStart.getDate()).toBe(1);
    expect(cycle.nextTransferDate.getDate()).toBe(15);
  });

  it("returns second-half cycle when on or after dayTwo", () => {
    const today = new Date("2026-06-20");
    const cycle = getCurrentCycle(today, defaultSettings);
    expect(cycle.cycleStart.getDate()).toBe(15);
    // Next transfer is dayOne of next month
    expect(cycle.nextTransferDate.getMonth()).toBe(6); // July
    expect(cycle.nextTransferDate.getDate()).toBe(1);
  });

  it("handles day before dayOne (previous month cycle)", () => {
    const settings: TransferSettings = {
      ...defaultSettings,
      dayOne: 5,
      dayTwo: 20,
    };
    // Day 3 is before dayOne(5) → we're in the tail of last month's second cycle
    const today = new Date("2026-06-03");
    const cycle = getCurrentCycle(today, settings);
    expect(cycle.nextTransferDate.getDate()).toBe(5);
    expect(cycle.nextTransferDate.getMonth()).toBe(5); // June
  });

  it("calculates daysUntilNextTransfer correctly", () => {
    const today = new Date("2026-06-10");
    const cycle = getCurrentCycle(today, defaultSettings);
    // June 10 → June 15 = 5 days
    expect(cycle.daysUntilNextTransfer).toBe(5);
  });

  it("calculates daysElapsedInCycle correctly", () => {
    const today = new Date("2026-06-10");
    const cycle = getCurrentCycle(today, defaultSettings);
    // June 1 → June 10 = 9 days elapsed
    expect(cycle.daysElapsedInCycle).toBe(9);
  });

  it("ensures totalDaysInCycle is at least 1", () => {
    const cycle = getCurrentCycle(new Date("2026-06-01"), defaultSettings);
    expect(cycle.totalDaysInCycle).toBeGreaterThanOrEqual(1);
  });

  it("generates a readable cycle label", () => {
    const today = new Date("2026-06-10");
    const cycle = getCurrentCycle(today, defaultSettings);
    expect(cycle.cycleLabel).toMatch(/1 – 15 Jun/);
  });

  it("handles exactly on dayOne", () => {
    const today = new Date("2026-06-01");
    const cycle = getCurrentCycle(today, defaultSettings);
    expect(cycle.cycleStart.getDate()).toBe(1);
    expect(cycle.daysElapsedInCycle).toBe(0);
  });

  it("handles exactly on dayTwo", () => {
    const today = new Date("2026-06-15");
    const cycle = getCurrentCycle(today, defaultSettings);
    // On dayTwo → second cycle starts
    expect(cycle.cycleStart.getDate()).toBe(15);
  });

  it("works with non-standard transfer days (10 and 25)", () => {
    const customSettings: TransferSettings = {
      ...defaultSettings,
      dayOne: 10,
      dayTwo: 25,
    };
    const today = new Date("2026-06-18");
    const cycle = getCurrentCycle(today, customSettings);
    expect(cycle.cycleStart.getDate()).toBe(10);
    expect(cycle.nextTransferDate.getDate()).toBe(25);
    expect(cycle.daysUntilNextTransfer).toBe(7);
  });
});
