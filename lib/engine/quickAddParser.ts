import { detectCategory } from "@/lib/engine/categoryDetector";
import type { CategoryId } from "@/lib/types";

export interface ParsedQuickAdd {
  amount: number;
  kind: "expense" | "income";
  description: string;
  category: CategoryId;
}

/**
 * Parses shorthand like "+11000 geprek" or "22000 galon".
 *
 * Convention (matches the spec's examples, all of which were expenses
 * written with a leading "+"): a bare number or a "+"-prefixed number
 * is logged as an EXPENSE. A "-"-prefixed number is logged as INCOME
 * (e.g. "-700000 transfer masuk" for an allowance landing). If your
 * mental model is the opposite of this, flip the two branches below —
 * it's isolated to this one function.
 */
export function parseQuickAdd(input: string): ParsedQuickAdd | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([+-]?)\s*([\d.,]+)\s*(.*)$/);
  if (!match) return null;

  const [, sign, rawAmount, rawDescription] = match;
  const cleanedAmount = (rawAmount ?? "").replace(/[.,]/g, "");
  const amount = parseInt(cleanedAmount, 10);

  if (!Number.isFinite(amount) || amount <= 0) return null;

  const description = (rawDescription ?? "").trim();
  const kind: "expense" | "income" = sign === "-" ? "income" : "expense";

  return {
    amount,
    kind,
    description,
    category: kind === "income" ? "savings" : detectCategory(description),
  };
}
