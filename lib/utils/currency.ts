const RUPIAH_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formats 70000 as "Rp70.000" */
export function formatRupiah(amount: number): string {
  return RUPIAH_FORMATTER.format(Math.round(amount)).replace(/\s/g, "");
}

/** Formats 70000 as "70.000" (no currency symbol), for compact UI contexts. */
export function formatNumberID(amount: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(amount));
}

/** Compact form for big targets, e.g. 40000000 -> "Rp40jt" */
export function formatRupiahCompact(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp${(amount / 1_000_000_000).toFixed(1)}M`;
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `Rp${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}jt`;
  }
  if (amount >= 1_000) return `Rp${Math.round(amount / 1000)}rb`;
  return formatRupiah(amount);
}

/**
 * Formats 1937350 as "Rp 1.937.350" — identical digits/grouping to
 * formatRupiah(), but with a single explicit ASCII space between the "Rp"
 * symbol and the amount. This is the canonical UI presentation form.
 *
 * Implemented via Intl.formatToParts so it is robust to ICU-version
 * differences: id-ID inserts a NON-BREAKING space (U+00A0) between the symbol
 * and the number on some platforms and nothing on others. We drop ICU's own
 * literal separators and rebuild with exactly one ASCII space, so the output
 * is deterministic across Node and browser engines.
 */
export function formatRupiahWithSpace(amount: number): string {
  const parts = RUPIAH_FORMATTER.formatToParts(Math.round(amount));
  let sign = "";
  let currency = "Rp";
  let digits = "";
  for (const part of parts) {
    switch (part.type) {
      case "minusSign":
        sign = "-";
        break;
      case "currency":
        currency = part.value;
        break;
      case "literal":
        // Drop ICU's literal separators (including the NBSP); we add our own.
        break;
      default:
        digits += part.value;
    }
  }
  return `${sign}${currency} ${digits}`;
}
