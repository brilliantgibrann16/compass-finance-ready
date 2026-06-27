// lib/utils/__tests__/currency.test.ts
// Pins the canonical "Rp 1.937.350" presentation spacing. id-ID Intl output
// separates the "Rp" symbol from the number with a NON-BREAKING space
// (U+00A0); formatRupiahWithSpace normalizes it to one ASCII space so the UI
// requirement is deterministic and regression-proof.

import { describe, it, expect } from "vitest";
import { formatRupiah, formatRupiahWithSpace } from "@/lib/utils/currency";

describe("formatRupiahWithSpace", () => {
  it("formats the GoPay Pinjam blueprint figure with an explicit space", () => {
    expect(formatRupiahWithSpace(1_937_350)).toBe("Rp 1.937.350");
  });

  it("inserts exactly one ASCII space (char code 32) after the symbol", () => {
    const out = formatRupiahWithSpace(70_000);
    expect(out).toBe("Rp 70.000");
    expect(out.charCodeAt(2)).toBe(32);
  });

  it("never contains a non-breaking space", () => {
    expect(formatRupiahWithSpace(1_937_350)).not.toContain("\u00A0");
  });

  it("uses id-ID grouping (periods as thousands separators)", () => {
    expect(formatRupiahWithSpace(1_000_000)).toBe("Rp 1.000.000");
  });

  it("rounds fractional input like the baseline formatter", () => {
    expect(formatRupiahWithSpace(1_937_349.6)).toBe("Rp 1.937.350");
  });

  it("handles zero", () => {
    expect(formatRupiahWithSpace(0)).toBe("Rp 0");
  });

  it("handles negative balances", () => {
    expect(formatRupiahWithSpace(-1_000)).toBe("-Rp 1.000");
  });

  it("keeps the same digits as baseline formatRupiah (only spacing differs)", () => {
    const withSpace = formatRupiahWithSpace(1_937_350);
    const baseline = formatRupiah(1_937_350);
    expect(withSpace.replace(/\s/g, "")).toBe(baseline);
  });
});
