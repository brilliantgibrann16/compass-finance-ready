"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/ui/PageLayout";
import { BottomNav } from "@/components/ui/BottomNav";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Brain, FileText, CreditCard,
  Target, ShoppingBag, Bell, ChevronRight,
  Download, Upload, CheckCircle, AlertTriangle, Shield,
} from "lucide-react";
import { clsx } from "clsx";

// ---------------------------------------------------------------------------
// Navigation menu items
// ---------------------------------------------------------------------------

const MENU_ITEMS = [
  {
    href: "/analytics",
    label: "Analytics",
    description: "Charts, trends & category breakdown",
    icon: BarChart3,
    accent: "text-purple-400",
    accentBg: "bg-purple-400/10",
  },
  {
    href: "/advisor",
    label: "AI Advisor",
    description: "Personalized financial recommendations",
    icon: Brain,
    accent: "text-gold",
    accentBg: "bg-gold/10",
  },
  {
    href: "/reports",
    label: "Monthly Reports",
    description: "Detailed summaries & PDF export",
    icon: FileText,
    accent: "text-sky-400",
    accentBg: "bg-sky-400/10",
  },
  {
    href: "/debt",
    label: "Debt Tracker",
    description: "Installments & payment schedule",
    icon: CreditCard,
    accent: "text-coral",
    accentBg: "bg-coral/10",
  },
  {
    href: "/goals",
    label: "Savings Goals",
    description: "Track your financial targets",
    icon: Target,
    accent: "text-emerald",
    accentBg: "bg-emerald/10",
  },
  {
    href: "/wishlist",
    label: "Wishlist",
    description: "Items you're saving for",
    icon: ShoppingBag,
    accent: "text-amber-400",
    accentBg: "bg-amber-400/10",
  },
  {
    href: "/notifications",
    label: "Notifications",
    description: "Alerts & reminders",
    icon: Bell,
    accent: "text-blue-400",
    accentBg: "bg-blue-400/10",
  },
] as const;

// ---------------------------------------------------------------------------
// Backup / Restore constants & validation
// ---------------------------------------------------------------------------

const STORAGE_KEY = "compass-finance-data";

/** Fields that MUST exist in a valid Compass backup file. */
const REQUIRED_FIELDS = [
  "balance",
  "transactions",
  "transferSettings",
  "debts",
  "savingsGoals",
  "wishlist",
  "notifications",
] as const;

const ARRAY_FIELDS = ["transactions", "debts", "savingsGoals", "wishlist", "notifications"] as const;
const MAX_BACKUP_ARRAY_LENGTH = 10_000;

type BackupEnvelope = { state: Record<string, unknown>; version: number };

const hasOwn = (obj: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(obj, key);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasPollutionKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasPollutionKey);
  if (!isPlainRecord(value)) return false;
  for (const key of Object.keys(value)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") return true;
    if (hasPollutionKey(value[key])) return true;
  }
  return false;
}

function isSafeArrayField(value: unknown): value is unknown[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_BACKUP_ARRAY_LENGTH &&
    value.every((entry) => isPlainRecord(entry))
  );
}

function validateBackup(data: unknown): { valid: true; raw: string } | { valid: false; error: string } {
  if (data === null || typeof data !== "object") {
    return { valid: false, error: "File does not contain a valid JSON object." };
  }

  if (!isPlainRecord(data) || hasPollutionKey(data)) {
    return { valid: false, error: "Backup contains unsafe object keys." };
  }

  const obj = data as Record<string, unknown>;

  if (!hasOwn(obj, "state") || !hasOwn(obj, "version")) {
    return { valid: false, error: "Backup must be a Zustand envelope with state and version." };
  }

  if (!isPlainRecord(obj.state)) {
    return { valid: false, error: '"state" must be a JSON object.' };
  }

  if (typeof obj.version !== "number" || !Number.isFinite(obj.version)) {
    return { valid: false, error: '"version" must be a finite number.' };
  }

  const statePayload = obj.state;

  for (const field of REQUIRED_FIELDS) {
    if (!hasOwn(statePayload, field)) {
      return { valid: false, error: `Missing required field: "${field}".` };
    }
  }

  if (typeof statePayload.balance !== "number" || !Number.isFinite(statePayload.balance)) {
    return { valid: false, error: '"balance" must be a finite number.' };
  }

  if (!isPlainRecord(statePayload.transferSettings)) {
    return { valid: false, error: '"transferSettings" must be an object.' };
  }

  for (const field of ARRAY_FIELDS) {
    if (!isSafeArrayField(statePayload[field])) {
      return {
        valid: false,
        error: `"${field}" must be an array of objects with at most ${MAX_BACKUP_ARRAY_LENGTH} entries.`,
      };
    }
  }

  const sanitizedEnvelope: BackupEnvelope = {
    state: REQUIRED_FIELDS.reduce<Record<string, unknown>>((acc, field) => {
      acc[field] = statePayload[field];
      return acc;
    }, {}),
    version: obj.version,
  };

  return { valid: true, raw: JSON.stringify(sanitizedEnvelope) };
}

// ---------------------------------------------------------------------------
// Toast feedback types
// ---------------------------------------------------------------------------

type ToastKind = "success" | "error";

interface ToastState {
  message: string;
  kind: ToastKind;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MorePage() {
  const hydrated = useHydrated();
  const unreadCount = useAppStore((s) => s.notifications.filter((n) => !n.isRead).length);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const flash = useCallback((message: string, kind: ToastKind) => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── BACKUP: Serialize store → download JSON ─────────────────────────────
  const handleBackup = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        flash("No data to backup — store is empty.", "error");
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const filename = `compass-finance-backup-${today}.json`;
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }, 100);

      flash(`Backup saved as ${filename}`, "success");
    } catch {
      flash("Backup failed — could not read store.", "error");
    }
  }, [flash]);

  // ── RESTORE: Read file → validate → inject into localStorage ────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so re-selecting the same file triggers onChange again
      e.target.value = "";

      const reader = new FileReader();
      reader.onerror = () => flash("Failed to read the file.", "error");
      reader.onload = () => {
        const text = reader.result;
        if (typeof text !== "string") {
          flash("Failed to read the file.", "error");
          return;
        }

        const trimmed = text.trim();
        if (trimmed.length === 0) {
          flash("Invalid file — backup is empty.", "error");
          return;
        }
        if (trimmed.length > 5_000_000) {
          flash("Invalid file — backup is too large.", "error");
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          flash("Invalid file — not valid JSON.", "error");
          return;
        }

        const check = validateBackup(parsed);
        if (!check.valid) {
          flash(check.error ?? "Invalid backup file.", "error");
          return;
        }

        // Stash the validated payload and ask for confirmation
        setPendingRestore(check.raw);
        setShowConfirm(true);
      };

      reader.readAsText(file);
    },
    [flash],
  );

  const confirmRestore = useCallback(() => {
    if (!pendingRestore) return;
    try {
      localStorage.setItem(STORAGE_KEY, pendingRestore);
      setShowConfirm(false);
      setPendingRestore(null);
      flash("Data restored! Reloading…", "success");
      setTimeout(() => window.location.reload(), 800);
    } catch {
      flash("Restore failed — could not write to storage.", "error");
    }
  }, [pendingRestore, flash]);

  const cancelRestore = useCallback(() => {
    setShowConfirm(false);
    setPendingRestore(null);
  }, []);

  if (!hydrated) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
        <div className="mb-6 h-16 animate-pulse rounded-xl bg-bg-hover" />
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-xl border border-border-soft bg-bg-raised" />
          <div className="h-20 animate-pulse rounded-xl border border-border-soft bg-bg-raised" />
          <div className="h-20 animate-pulse rounded-xl border border-border-soft bg-bg-raised" />
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <PageLayout title="More" subtitle="All features & tools">

      {/* ── Navigation Grid ───────────────────────────────────────────── */}
      <div className="space-y-2">
        {MENU_ITEMS.map((item, i) => {
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 rounded-xl border border-border-soft bg-bg-raised p-4 transition hover:border-gold/20 active:scale-[0.98]"
              >
                <div className={clsx(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  item.accentBg,
                )}>
                  <Icon size={20} className={item.accent} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-semibold text-ink">{item.label}</p>
                    {item.href === "/notifications" && unreadCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted">{item.description}</p>
                </div>

                <ChevronRight size={16} className="shrink-0 text-ink-faint" />
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* ── Backup & Restore Section ──────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-gold" />
          <h2 className="font-display text-sm font-semibold text-ink">Data Protection</h2>
        </div>

        <div className="rounded-xl border border-border-soft bg-bg-raised p-4 space-y-3">
          <p className="text-xs text-ink-muted leading-relaxed">
            All data is stored locally on this device. Create a backup before resetting your phone
            or switching devices.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Backup Button */}
            <button
              onClick={handleBackup}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald/30 bg-emerald/5 py-3 text-sm font-semibold text-emerald transition hover:bg-emerald/10 active:scale-[0.97]"
            >
              <Download size={16} />
              Backup
            </button>

            {/* Restore Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/5 py-3 text-sm font-semibold text-sky-400 transition hover:bg-sky-400/10 active:scale-[0.97]"
            >
              <Upload size={16} />
              Restore
            </button>
          </div>

          {/* Hidden file input for restore */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </motion.section>

      {/* ── Confirmation Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-border-soft bg-bg-raised p-6 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                  <AlertTriangle size={20} className="text-amber-400" />
                </div>
                <h3 className="font-display text-base font-semibold text-ink">Replace All Data?</h3>
              </div>

              <p className="text-sm text-ink-muted leading-relaxed mb-5">
                This will <strong className="text-ink">overwrite all current data</strong> with the
                contents of the backup file. This action cannot be undone.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={cancelRestore}
                  className="rounded-xl border border-border-soft py-2.5 text-sm font-semibold text-ink-muted transition hover:bg-bg active:scale-[0.97]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRestore}
                  className="rounded-xl bg-gold py-2.5 text-sm font-semibold text-bg transition hover:bg-gold/90 active:scale-[0.97]"
                >
                  Yes, Restore
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast Notification ────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={clsx(
              "fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 shadow-xl",
              toast.kind === "success"
                ? "border border-emerald/30 bg-emerald/10 text-emerald"
                : "border border-coral/30 bg-coral/10 text-coral",
            )}
          >
            {toast.kind === "success" ? (
              <CheckCircle size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </PageLayout>
  );
}
