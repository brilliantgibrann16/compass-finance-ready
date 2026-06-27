import type { Category, CategoryId } from "@/lib/types";

export const CATEGORIES: Record<CategoryId, Category> = {
  food: { id: "food", label: "Food", icon: "UtensilsCrossed", color: "#F0B429" },
  water: { id: "water", label: "Water", icon: "Droplets", color: "#38BDF8" },
  grooming: { id: "grooming", label: "Grooming", icon: "Sparkles", color: "#C084FC" },
  shopping: { id: "shopping", label: "Shopping", icon: "ShoppingBag", color: "#F472B6" },
  transport: { id: "transport", label: "Transport", icon: "Bike", color: "#FB923C" },
  bills: { id: "bills", label: "Bills", icon: "Receipt", color: "#A3A3A3" },
  health: { id: "health", label: "Health", icon: "HeartPulse", color: "#F87171" },
  entertainment: { id: "entertainment", label: "Entertainment", icon: "Tv", color: "#818CF8" },
  savings: { id: "savings", label: "Savings", icon: "PiggyBank", color: "#34D399" },
  other: { id: "other", label: "Other", icon: "CircleDashed", color: "#8A93A6" },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

/**
 * Keyword -> category map, lowercase, no punctuation.
 * Longest/most-specific keywords should be listed first within a
 * category so substring checks don't get short-circuited by a vaguer
 * term (not currently an issue, but keep this ordering convention as
 * the list grows).
 */
const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  food: [
    "geprek", "ayam", "indomie", "mie", "nasi", "makan", "jajan",
    "bakso", "soto", "warteg", "padang", "seblak", "kfc", "mcd",
    "burger", "pizza", "sate", "rendang", "gorengan",
  ],
  water: ["galon", "le minerale", "leminerale", "aqua", "air mineral"],
  grooming: ["sabun", "shampoo", "sampo", "facewash", "skincare", "sunscreen", "pasta gigi"],
  shopping: ["shopee", "tokopedia", "lazada", "baju", "sepatu"],
  transport: ["gojek", "grab", "bensin", "parkir", "ojek", "krl", "tol", "maxim"],
  bills: ["listrik", "wifi", "pulsa", "token", "internet", "kos", "kost", "indekos"],
  health: ["obat", "apotek", "dokter", "vitamin", "klinik"],
  entertainment: ["netflix", "spotify", "bioskop", "game", "steam"],
  savings: ["tabung", "nabung", "transfer ke tabungan"],
  other: [],
};

export function detectCategory(text: string): CategoryId {
  const lower = text.toLowerCase().trim();
  if (!lower) return "other";

  for (const category of Object.keys(CATEGORY_KEYWORDS) as CategoryId[]) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }
  return "other";
}
