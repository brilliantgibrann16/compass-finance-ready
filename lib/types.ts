/**
 * Core domain model for Compass.
 *
 * Keep this file dependency-free (no React, no Zustand) so it can be
 * shared by the UI, the calculation engine, and any future API layer
 * (e.g. Supabase tables can mirror these shapes almost 1:1).
 */

export type CategoryId =
  | "food"
  | "water"
  | "grooming"
  | "shopping"
  | "transport"
  | "bills"
  | "health"
  | "entertainment"
  | "savings"
  | "other";

export interface Category {
  id: CategoryId;
  label: string;
  icon: string; // lucide-react icon name
  color: string; // hex
}

export type TransactionSource = "quick-add" | "receipt-scan" | "manual" | "transfer";

export interface Transaction {
  id: string;
  /** Always a positive number. Direction is carried by `kind`. */
  amount: number;
  kind: "expense" | "income";
  category: CategoryId;
  merchant?: string;
  note?: string;
  /** ISO 8601 date string, e.g. 2026-06-17 */
  date: string;
  source: TransactionSource;
  receiptImageUrl?: string;
  items?: ReceiptItem[];
  createdAt: string;
}

export type IncomeFrequency = "weekly" | "biweekly" | "monthly" | "custom";

export interface TransferSettings {
  /** Day-of-month for the first transfer in a cycle, e.g. 1 */
  dayOne: number;
  /** Day-of-month for the second transfer in a cycle, e.g. 15 */
  dayTwo: number;
  amountPerTransfer: number;
  /** Income frequency — defaults to "monthly" */
  frequency?: IncomeFrequency;
  /** For custom frequency: interval in days */
  customIntervalDays?: number;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  /** ISO date string for next due date */
  dueDate?: string;
  isActive: boolean;
}

export interface DebtInstallment {
  id: string;
  /** ISO date, e.g. 2026-06-25 */
  dueDate: string;
  amount: number;
  isPaid: boolean;
  paidAt?: string;
}

export interface Debt {
  id: string;
  /** e.g. "SPayLater", "GoPay Pinjam" */
  name: string;
  installments: DebtInstallment[];
}

export type WishlistPriority = "low" | "medium" | "high";

export interface WishlistItem {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContribution: number;
  targetDate?: string;
  priority: WishlistPriority;
  createdAt: string;
  achievedAt?: string;
}

export type SavingsGoalType = "graduation" | "emergency" | "custom";

export interface SavingsGoal {
  id: string;
  name: string;
  type: SavingsGoalType;
  targetAmount: number;
  currentAmount: number;
  /** ISO date string, optional for goals with no fixed deadline */
  targetDate?: string;
  monthlyContribution: number;
  createdAt: string;
  milestonesReached: number[];
}

export type NotificationType = "warning" | "info" | "success" | "reminder";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  /** Optional link to navigate to */
  href?: string;
}

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

export interface ReceiptScanResult {
  merchant: string;
  amount: number;
  date: string;
  category: CategoryId;
  confidence: number;
  rawText: string;
  items?: ReceiptItem[];
}

export interface AppData {
  balance: number;
  transactions: Transaction[];
  transferSettings: TransferSettings;
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  wishlist: WishlistItem[];
  notifications: AppNotification[];
}
