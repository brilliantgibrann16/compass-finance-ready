"use client";

import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { PageHeader } from "@/components/ui/PageHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { Card } from "@/components/ui/Card";
import { generateCoachTips, type CoachTipType } from "@/lib/engine/coachEngine";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed, AlertTriangle, Bike, PiggyBank,
  ShieldCheck, Clock, Trophy, Target, Sparkles, Brain,
} from "lucide-react";
import { clsx } from "clsx";

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

const TYPE_LABELS: Record<CoachTipType, string> = {
  spending: "Spending",
  savings: "Savings",
  debt: "Debt",
  goal: "Goals",
};

export default function CoachPage() {
  const hydrated = useHydrated();
  const transactions = useAppStore((s) => s.transactions);
  const debts = useAppStore((s) => s.debts);
  const savingsGoals = useAppStore((s) => s.savingsGoals);
  const wishlist = useAppStore((s) => s.wishlist);
  const transferSettings = useAppStore((s) => s.transferSettings);
  const balance = useAppStore((s) => s.balance);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold" />
      </div>
    );
  }

  const tips = generateCoachTips(transactions, debts, savingsGoals, wishlist, transferSettings, balance);

  // Group tips by type
  const grouped = tips.reduce<Record<CoachTipType, typeof tips>>((acc, tip) => {
    if (!acc[tip.type]) acc[tip.type] = [];
    acc[tip.type]!.push(tip);
    return acc;
  }, {} as Record<CoachTipType, typeof tips>);

  const typeOrder: CoachTipType[] = ["spending", "debt", "savings", "goal"];

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <PageHeader title="Budget Coach" subtitle="Your personal finance advisor" />

      {/* Coach Avatar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6 flex items-center gap-4 rounded-xl2 border border-gold/20 bg-bg-raised p-5 shadow-glow"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/10">
          <Brain size={24} className="text-gold" />
        </div>
        <div>
          <p className="font-display font-semibold text-ink">
            {tips.length === 0 ? "All clear!" : `${tips.length} recommendation${tips.length === 1 ? "" : "s"}`}
          </p>
          <p className="text-sm text-ink-muted">
            {tips.length === 0
              ? "Your finances look healthy right now. Keep it up!"
              : "Here's what I recommend based on your spending patterns."}
          </p>
        </div>
      </motion.div>

      {tips.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald/10">
              <Trophy size={24} className="text-emerald" />
            </div>
            <p className="font-display font-medium text-ink">Great job!</p>
            <p className="text-sm text-ink-muted">
              No actionable recommendations right now. Add more transactions to get personalized tips.
            </p>
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
                <h3 className={clsx("mb-3 text-sm font-semibold uppercase tracking-wider", style.accent)}>
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
                            style.bg, style.border
                          )}
                        >
                          <IconComp size={18} className={clsx("mt-0.5 shrink-0", style.accent)} />
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
