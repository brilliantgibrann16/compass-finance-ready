import type { AppData } from "@/lib/types";

/**
 * Pristine baseline state.
 *
 * Compass ships as a freshly-downloaded application with ZERO pre-existing
 * data: no balance, no transactions, no debts, no savings goals, no
 * wishlist items, and no notifications. Every feature card stays empty
 * until the user records their own data.
 *
 * `transferSettings` are editable configuration defaults (the allowance
 * cadence) rather than user data — adjust them from the Settings sheet.
 */
export const SEED_DATA: AppData = {
  balance: 0,
  transactions: [],
  transferSettings: {
    dayOne: 1,
    dayTwo: 15,
    amountPerTransfer: 1_250_000,
    frequency: "monthly",
  },
  debts: [],
  savingsGoals: [],
  wishlist: [],
  notifications: [],
};
