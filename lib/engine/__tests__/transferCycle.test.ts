import { describe, it, expect } from "vitest";
import { getCurrentCycle } from "../transferCycle";
import type { TransferSettings } from "../../types";

const settings: TransferSettings = { dayOne: 1, dayTwo: 15, amountPerTransfer: 1500000 };

describe("transferCycle", () => {
  it("returns first-half cycle when day is between dayOne and dayTwo", () => {
    const today = new Date("2026-06-10");
    const cycle = getCurrentCycle(today, settings);

    expect(cycle.cycleStart.getDate()).toBe(1);
    expect(cycle.nextTransferDate.getDate()).toBe(15);
    expect(cycle.daysElapsedInCycle).toBe(9);
    expect(cycle.daysUntilNextTransfer).toBe(5);
    expect(cycle.totalDaysInCycle).toBe(14);
    expect(cycle.cycleLabel).toContain("1");
    expect(cycle.cycleLabel).toContain("15");
  });

  it("returns second-half cycle when day is >= dayTwo", () => {
    const today = new Date("2026-06-20");
    const cycle = getCurrentCycle(today, settings);

    expect(cycle.cycleStart.getDate()).toBe(15);
    expect(cycle.nextTransferDate.getMonth()).toBe(6); // July
    expect(cycle.nextTransferDate.getDate()).toBe(1);
    expect(cycle.daysElapsedInCycle).toBe(5);
  });

  it("handles day < dayOne (non-1 start day)", () => {
    const customSettings: TransferSettings = { dayOne: 5, dayTwo: 20, amountPerTransfer: 1000000 };
    const today = new Date("2026-06-03");
    const cycle = getCurrentCycle(today, customSettings);

    expect(cycle.nextTransferDate.getDate()).toBe(5);
    expect(cycle.nextTransferDate.getMonth()).toBe(5); // June
  });

  it("starts a new cycle on the transfer day itself", () => {
    // On dayTwo (15th), we enter the second-half cycle [15, 1st next month)
    const today = new Date("2026-06-15");
    const cycle = getCurrentCycle(today, settings);
    expect(cycle.cycleStart.getDate()).toBe(15);
    expect(cycle.daysElapsedInCycle).toBe(0);
    expect(cycle.daysUntilNextTransfer).toBe(16); // 16 days until Jul 1
  });

  it("returns correct values on dayOne", () => {
    const today = new Date("2026-06-01");
    const cycle = getCurrentCycle(today, settings);

    expect(cycle.cycleStart.getDate()).toBe(1);
    expect(cycle.daysElapsedInCycle).toBe(0);
    expect(cycle.daysUntilNextTransfer).toBe(14);
  });

  it("totalDaysInCycle is always at least 1", () => {
    const today = new Date("2026-06-10");
    const cycle = getCurrentCycle(today, settings);
    expect(cycle.totalDaysInCycle).toBeGreaterThanOrEqual(1);
  });

  it("cycleLabel includes month abbreviation", () => {
    const today = new Date("2026-06-10");
    const cycle = getCurrentCycle(today, settings);
    expect(cycle.cycleLabel).toContain("Jun");
  });
});
