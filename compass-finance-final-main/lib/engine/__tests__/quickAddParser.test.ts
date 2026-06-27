// lib/engine/__tests__/quickAddParser.test.ts
import { describe, it, expect } from "vitest";
import { parseQuickAdd } from "../quickAddParser";

describe("parseQuickAdd", () => {
  // ── Basic expense parsing ───────────────────────────────────────────
  it("parses bare number as expense", () => {
    const result = parseQuickAdd("11000 geprek");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(11000);
    expect(result!.kind).toBe("expense");
    expect(result!.description).toBe("geprek");
  });

  it("parses + prefix as expense", () => {
    const result = parseQuickAdd("+22000 galon");
    expect(result!.amount).toBe(22000);
    expect(result!.kind).toBe("expense");
    expect(result!.description).toBe("galon");
  });

  it("parses - prefix as income", () => {
    const result = parseQuickAdd("-700000 transfer masuk");
    expect(result!.amount).toBe(700000);
    expect(result!.kind).toBe("income");
    expect(result!.description).toBe("transfer masuk");
  });

  // ── Category detection ──────────────────────────────────────────────
  it("detects food category from Indonesian keywords", () => {
    const result = parseQuickAdd("15000 bakso");
    expect(result!.category).toBe("food");
  });

  it("detects transport category", () => {
    const result = parseQuickAdd("25000 gojek");
    expect(result!.category).toBe("transport");
  });

  it("detects water category", () => {
    const result = parseQuickAdd("20000 galon");
    expect(result!.category).toBe("water");
  });

  it("assigns savings category for income", () => {
    const result = parseQuickAdd("-500000 transfer");
    expect(result!.category).toBe("savings");
  });

  it("falls back to other for unknown descriptions", () => {
    const result = parseQuickAdd("50000 random stuff xyz");
    expect(result!.category).toBe("other");
  });

  // ── Edge cases ──────────────────────────────────────────────────────
  it("returns null for empty input", () => {
    expect(parseQuickAdd("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(parseQuickAdd("   ")).toBeNull();
  });

  it("returns null for zero amount", () => {
    expect(parseQuickAdd("0 something")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(parseQuickAdd("hello world")).toBeNull();
  });

  it("strips thousand separators (dots and commas)", () => {
    const result = parseQuickAdd("1.500.000 tabungan");
    expect(result!.amount).toBe(1500000);
  });

  it("handles amount with no description", () => {
    const result = parseQuickAdd("25000");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(25000);
    expect(result!.description).toBe("");
  });

  it("handles leading/trailing whitespace", () => {
    const result = parseQuickAdd("  +15000 nasi padang  ");
    expect(result!.amount).toBe(15000);
    expect(result!.description).toBe("nasi padang");
  });

  it("handles space between sign and number", () => {
    const result = parseQuickAdd("+ 11000 geprek");
    expect(result!.amount).toBe(11000);
    expect(result!.kind).toBe("expense");
  });
});
