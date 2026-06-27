"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { PageHeader } from "@/components/ui/PageHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { Card } from "@/components/ui/Card";
import { generateCoachTips, type CoachTipType } from "@/lib/engine/coachEngine";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed, AlertTriangle, Bike, PiggyBank,
  ShieldCheck, Clock, Trophy, Target, Sparkles,
  Loader2, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import {
  getEdgeFunctionUrl,
  getAccessToken,
  isSupabaseConfigured,
} from "@/lib/auth/supabaseClient";

const ICON_MAP: Record<string, React.ElementType> = {
  UtensilsCrossed, AlertTriangle, Bike, PiggyBank,
  ShieldCheck, Clock, Trophy, Target, Sparkles,
};

const TYPE_STYLES: Record<CoachTipType, { accent: string; bg: string; border: string }> = {
  spending: { accent: "text-coral", bg: "bg-coral/5", border: "border-coral/20" },
  savings: { accent: "text-emerald", bg: "bg-emerald/5", border: "border-emerald/20" },
  debt: { accent: "text-gold", bg: "bg-gold/5", border: "border-gold/20" },
  goal: { accent: "text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/20" },
};

// ── Secure AI Coach Routing ─────────────────────────────────────────────
// SECURITY: The client NEVER talks to the model provider (router.bynara.id)
// directly and NEVER carries a provider bearer token. All AI calls are proxied
// through the `bynance-coach` Supabase Edge Function, which holds the provider
// secret server-side and validates the caller's Supabase JWT. This guarantees
// only authenticated users can spend our AI tokens.
const COACH_FUNCTION_NAME = "bynance-coach";

// Model label shown in the UI badge only — not a secret, server picks the model.
const COACH_MODEL =
  process.env.NEXT_PUBLIC_COACH_MODEL || "nara/mimo-v2.5-pro-free";

// Generic, non-leaking user-facing message for any failure path. We never
// surface raw status codes, stack traces, or network internals to the
// iOS LiveContainer viewport.
const AI_ERROR_MESSAGE = "advice could not be loaded";

export default function CoachPage() {
  const hydrated = useHydrated();
  const { t, locale } = useTranslation();
  const transactions = useAppStore((s) => s.transactions);
  const debts = useAppStore((s) => s.debts);
  const savingsGoals = useAppStore((s) => s.savingsGoals);
  const wishlist = useAppStore((s) => s.wishlist);
  const transferSettings = useAppStore((s) => s.transferSettings);
  const balance = useAppStore((s) => s.balance);

  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  // Build financial context snapshot for the AI
  const buildContext = useCallback(() => {
    const recentExpenses = transactions
      .filter((tx) => tx.kind === "expense")
      .slice(0, 30);

    const totalExpensesThisMonth = recentExpenses.reduce((sum, tx) => sum + tx.amount, 0);
    const totalRemainingDebt = debts.reduce(
      (sum, d) =>
        sum + d.installments.filter((i) => !i.isPaid).reduce((s, i) => s + i.amount, 0),
      0,
    );

    const topCategories = recentExpenses.reduce<Record<string, number>>((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});

    return {
      balance,
      totalExpensesThisMonth,
      totalRemainingDebt,
      debtSources: debts.map((d) => ({
        name: d.name,
        remaining: d.installments.filter((i) => !i.isPaid).reduce((s, i) => s + i.amount, 0),
        nextDue: d.installments.find((i) => !i.isPaid)?.dueDate,
      })),
      savingsGoals: savingsGoals.map((g) => ({
        name: g.name,
        target: g.targetAmount,
        current: g.currentAmount,
        monthly: g.monthlyContribution,
      })),
      incomePerTransfer: transferSettings.amountPerTransfer,
      frequency: transferSettings.frequency || "monthly",
      topSpendingCategories: Object.entries(topCategories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat, amount]) => ({ category: cat, amount })),
      wishlistCount: wishlist.length,
    };
  }, [balance, debts, transactions, savingsGoals, transferSettings, wishlist]);

  // Auto-pilot AI advice via the secure `bynance-coach` Supabase Edge Function.
  // The provider key and prompt-engineering live server-side; the client only
  // sends the clean financial matrix + an authenticated JWT.
  const fetchAIAdvice = useCallback(async () => {
    // Without Supabase configured there is no secure proxy to call. Stay silent
    // and let the local rules-based coach tips carry the experience.
    if (!isSupabaseConfigured()) return;

    const endpoint = getEdgeFunctionUrl(COACH_FUNCTION_NAME);
    if (!endpoint) return;

    setAiLoading(true);
    setAiError(false);
    try {
      // Per-user JWT (falls back to the public anon key when no session).
      const token = await getAccessToken();
      if (!token) {
        setAiError(true);
        return;
      }

      const context = buildContext();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authenticated call — only logged-in users can spend AI tokens.
          Authorization: `Bearer ${token}`,
        },
        // Clean financial data matrix only. No secrets, no prompt — the Edge
        // Function owns model selection and prompt construction.
        body: JSON.stringify({
          locale,
          context,
        }),
      });

      if (!response.ok) {
        setAiError(true);
        return;
      }

      const data = await response.json().catch(() => null);
      const content =
        (data &&
          (data.advice ||
            data.content ||
            data.choices?.[0]?.message?.content ||
            data.choices?.[0]?.text ||
            data.text)) ||
        "";

      if (content) {
        setAiResponse(content);
      } else {
        setAiError(true);
      }
    } catch {
      // Never surface raw errors (status codes, stack traces, network details)
      // to the iOS LiveContainer viewport. Generic flag only.
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  }, [buildContext, locale]);

  useEffect(() => {
    if (hydrated) {
      fetchAIAdvice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold" />
      </div>
    );
  }

  const tips = generateCoachTips(transactions, debts, savingsGoals, wishlist, transferSettings, balance);

  const grouped = tips.reduce<Record<CoachTipType, typeof tips>>((acc, tip) => {
    if (!acc[tip.type]) acc[tip.type] = [];
    acc[tip.type]!.push(tip);
    return acc;
  }, {} as Record<CoachTipType, typeof tips>);

  const TYPE_LABELS: Record<CoachTipType, string> = {
    spending: t("spending"),
    savings: t("savings"),
    debt: t("debt"),
    goal: t("goals"),
  };

  const typeOrder: CoachTipType[] = ["spending", "debt", "savings", "goal"];

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <PageHeader title={t("budgetCoach")} subtitle={t("budgetCoachSubtitle")} />

      {/* Coach Avatar / Summary Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6 flex items-center gap-4 rounded-xl2 border border-gold/20 bg-bg-raised p-5 shadow-glow"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bynance.png" alt="Bynance" className="h-10 w-10 object-contain" />
        </div>
        <div>
          <p className="font-display font-semibold text-ink">
            {tips.length === 0
              ? t("allClear")
              : `${tips.length} ${tips.length === 1 ? t("recommendation") : t("recommendations")}`}
          </p>
          <p className="text-sm text-ink-muted">
            {tips.length === 0 ? t("financesHealthy") : t("hereIsWhat")}
          </p>
        </div>
      </motion.div>

      {/* ── Bynance AI Response Card ──────────────────────────────────── */}
      {aiLoading && (
        <Card className="mb-4">
          <div className="flex items-center gap-3 py-4">
            <Loader2 size={18} className="animate-spin text-gold" />
            <p className="text-sm text-ink-muted">{t("aiAnalyzing")}</p>
          </div>
        </Card>
      )}

      {aiResponse && !aiLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-gold" />
                <h3 className="font-display text-sm font-semibold text-ink">Bynance AI</h3>
                <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[9px] font-mono text-gold/70">
                  {COACH_MODEL.split("/").pop()}
                </span>
              </div>
              <button
                onClick={fetchAIAdvice}
                className="rounded-full p-1.5 text-ink-faint transition hover:bg-bg-hover hover:text-gold"
                aria-label="Refresh AI advice"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
              {aiResponse}
            </div>
          </Card>
        </motion.div>
      )}

      {aiError && !aiLoading && !aiResponse && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <button
            onClick={fetchAIAdvice}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-soft bg-bg-raised py-3 text-sm text-ink-muted transition hover:border-gold/20"
            aria-label={AI_ERROR_MESSAGE}
          >
            <RefreshCw size={14} />
            Retry Bynance AI
          </button>
        </motion.div>
      )}

      {/* ── Local Coach Tips ──────────────────────────────────────────── */}
      {tips.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald/10">
              <Trophy size={24} className="text-emerald" />
            </div>
            <p className="font-display font-medium text-ink">{t("greatJob")}</p>
            <p className="text-sm text-ink-muted">{t("noRecommendations")}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {typeOrder.map((type) => {
            const typeTips = grouped[type];
            if (!typeTips || typeTips.length === 0) return null;
            const style = TYPE_STYLES[type];

            return (
              <div key={type}>
                <h3
                  className={clsx(
                    "mb-3 text-sm font-semibold uppercase tracking-wider",
                    style.accent,
                  )}
                >
                  {TYPE_LABELS[type]}
                </h3>
                <AnimatePresence>
                  <div className="space-y-3">
                    {typeTips.map((tip, idx) => {
                      const IconComp = ICON_MAP[tip.icon] ?? Sparkles;
                      return (
                        <motion.div
                          key={tip.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={clsx(
                            "flex items-start gap-3 rounded-xl2 border p-4",
                            style.bg,
                            style.border,
                          )}
                        >
                          <IconComp
                            size={18}
                            className={clsx("mt-0.5 shrink-0", style.accent)}
                          />
                          <p className="text-sm leading-relaxed text-ink">{tip.message}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
