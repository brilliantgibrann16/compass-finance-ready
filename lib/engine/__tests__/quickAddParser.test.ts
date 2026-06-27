import { describe, it, expect } from "vitest";
import { parseQuickAdd } from "../quickAddParser";

describe("quickAddParser", () => {
  it("parses a bare number + description as an expense", () => {
    const result = parseQuickAdd("11000 geprek");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(11000);
    expect(result!.kind).toBe("expense");
    expect(result!.description).toBe("geprek");
    expect(result!.category).toBe("food");
  });

  it("parses a + prefixed number as an expense", () => {
    const result = parseQuickAdd("+22000 galon");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(22000);
    expect(result!.kind).toBe("expense");
    expect(result!.description).toBe("galon");
    expect(result!.category).toBe("water");
  });

  it("parses a - prefixed number as income", () => {
    const result = parseQuickAdd("-700000 transfer masuk");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(700000);
    expect(result!.kind).toBe("income");
    expect(result!.description).toBe("transfer masuk");
    expect(result!.category).toBe("savings");
  });

  it("handles amounts with dots or commas as thousand separators", () => {
    const result = parseQuickAdd("1.500.000 belanja");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1500000);
  });

  it("returns null for empty string", () => {
    expect(parseQuickAdd("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseQuickAdd("   ")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(parseQuickAdd("geprek enak")).toBeNull();
  });

  it("returns null for zero amount", () => {
    expect(parseQuickAdd("0 something")).toBeNull();
  });

  it("handles description-less input", () => {
    const result = parseQuickAdd("15000");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(15000);
    expect(result!.description).toBe("");
    expect(result!.kind).toBe("expense");
  });

  it("detects category from description keywords", () => {
    const transport = parseQuickAdd("20000 gojek");
    expect(transport!.category).toBe("transport");

    const food = parseQuickAdd("25000 bakso");
    expect(food!.category).toBe("food");

    const bills = parseQuickAdd("50000 pulsa");
    expect(bills!.category).toBe("bills");
  });

  it("defaults to 'other' for unrecognized description", () => {
    const result = parseQuickAdd("10000 random stuff");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("other");
  });

  it("trims surrounding whitespace", () => {
    const result = parseQuickAdd("  15000 nasi goreng  ");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(15000);
    expect(result!.description).toBe("nasi goreng");
  });
});
