"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { PageHeader } from "@/components/ui/PageHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { Card } from "@/components/ui/Card";
import { formatRupiahCompact } from "@/lib/utils/currency";
import {
  getRecommendations,
  getMonthComparison,
  getSavingsForecasts,
  getGoalForecasts,
  getDebtForecasts,
  getOverspendingAlerts,
  getMerchantAnalysis,
  type AdvisorRecommendation,
  type AdvisorSeverity,
} from "@/lib/engine/advisorEngine";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, TrendingUp, TrendingDown, Minus, Target, CreditCard,
  AlertTriangle, Store, Sparkles, Shield, ChevronRight,
  PiggyBank, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";

const SEVERITY_STYLES: Record<AdvisorSeverity, { bg: string; border: string; icon: string; badge: string }> = {
  critical: { bg: "bg-red-500/5", border: "border-red-500/20", icon: "text-red-400", badge: "bg-red-500/10 text-red-400" },
  warning: { bg: "bg-amber-500/5", border: "border-amber-500/20", icon: "text-amber-400", badge: "bg-amber-500/10 text-amber-400" },
  info: { bg: "bg-sky-500/5", border: "border-sky-500/20", icon: "text-sky-400", badge: "bg-sky-500/10 text-sky-400" },
  success: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", icon: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400" },
};

function SeverityIcon({ severity }: { severity: AdvisorSeverity }) {
  const cn = SEVERITY_STYLES[severity].icon;
  switch (severity) {
    case "critical": return <AlertTriangle size={16} className={cn} />;
    case "warning": return <AlertTriangle size={16} className={cn} />;
    case "success": return <Sparkles size={16} className={cn} />;
    default: return <Brain size={16} className={cn} />;
  }
}

export default function AdvisorPage() {
  const hydrated = useHydrated();
  const transactions = useAppStore((s) => s.transactions);
  const balance = useAppStore((s) => s.balance);
  const goals = useAppStore((s) => s.savingsGoals);
  const debts = useAppStore((s) => s.debts);

  const today = useMemo(() => new Date(), []);

  const recommendations = useMemo(
    () => getRecommendations(transactions, balance, goals, debts, today),
    [transactions, balance, goals, debts, today],
  );

  const comparison = useMemo(() => getMonthComparison(transactions, today), [transactions, today]);
  const forecasts = useMemo(() => getSavingsForecasts(transactions, balance, today), [transactions, balance, today]);
  const goalForecasts = useMemo(() => getGoalForecasts(goals, today), [goals, today]);
  const debtForecasts = useMemo(() => getDebtForecasts(debts, today), [debts, today]);
  const alerts = useMemo(() => getOverspendingAlerts(transactions, today), [transactions, today]);
  const merchants = useMemo(() => getMerchantAnalysis(transactions), [transactions]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold" />
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <PageHeader title="AI Advisor" subtitle="Personalized financial insights" />

      {/* ── Recommendations ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-gold" />
          <h2 className="font-display text-sm font-semibold text-ink">Recommendations</h2>
          <span className="ml-auto rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
            {recommendations.length}
          </span>
        </div>

        {recommendations.length === 0 ? (
          <Card className="text-center !py-8">
            <Sparkles size={32} className="mx-auto mb-2 text-gold/40" />
            <p className="text-sm text-ink-muted">Everything looks great! No recommendations right now.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {recommendations.map((rec, i) => (
                <RecommendationCard key={rec.id} rec={rec} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ── Month Comparison ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {comparison.direction === "down" ? (
            <TrendingDown size={16} className="text-emerald" />
          ) : comparison.direction === "up" ? (
            <TrendingUp size={16} className="text-coral" />
          ) : (
            <Minus size={16} className="text-ink-faint" />
          )}
          <h2 className="font-display text-sm font-semibold text-ink">Month Comparison</h2>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-ink-faint uppercase tracking-wider">This month</p>
              <p className="font-mono text-lg font-bold text-ink">{formatRupiahCompact(comparison.thisMonthTotal)}</p>
            </div>
            <div className="text-center">
              <span className={clsx(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                comparison.direction === "down" ? "bg-emerald/10 text-emerald" :
                comparison.direction === "up" ? "bg-coral/10 text-coral" : "bg-bg text-ink-faint"
              )}>
                {comparison.direction === "up" && <ArrowUpRight size={10} />}
                {comparison.direction === "down" && <ArrowDownRight size={10} />}
                {comparison.changePercent !== 0 ? `${Math.abs(comparison.changePercent)}%` : "Same"}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-ink-faint uppercase tracking-wider">Last month</p>
              <p className="font-mono text-lg font-bold text-ink-muted">{formatRupiahCompact(comparison.lastMonthTotal)}</p>
            </div>
          </div>

          {comparison.categoryChanges.length > 0 && (
            <div className="border-t border-border-soft pt-3 space-y-1.5">
              {comparison.categoryChanges.slice(0, 4).map((c) => (
                <div key={c.category} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="flex-1 text-ink-muted">{c.label}</span>
                  <span className={clsx(
                    "font-mono text-[10px]",
                    c.direction === "up" ? "text-coral" : c.direction === "down" ? "text-emerald" : "text-ink-faint"
                  )}>
                    {c.direction === "up" ? "+" : c.direction === "down" ? "" : ""}{c.changePercent}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* ── Savings Forecast ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <PiggyBank size={16} className="text-emerald" />
          <h2 className="font-display text-sm font-semibold text-ink">Savings Forecast</h2>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {forecasts.map((f) => (
            <motion.div
              key={f.months}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-border-soft bg-bg-raised p-3 text-center"
            >
              <p className="text-[10px] text-ink-faint mb-1">{f.months}mo</p>
              <p className={clsx(
                "font-mono text-sm font-semibold",
                f.projectedSavings >= 0 ? "text-emerald" : "text-coral"
              )}>
                {f.projectedSavings >= 0 ? "+" : ""}{formatRupiahCompact(f.projectedSavings)}
              </p>
              <p className="font-mono text-[10px] text-ink-faint mt-0.5">{formatRupiahCompact(f.projectedBalance)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Goal Forecasts ── */}
      {goalForecasts.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-gold" />
            <h2 className="font-display text-sm font-semibold text-ink">Goal Forecasts</h2>
          </div>

          <div className="space-y-2">
            {goalForecasts.map((g) => (
              <Card key={g.goalId} className="!p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-ink">{g.goalName}</span>
                  <span className={clsx(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    g.onTrack ? "bg-emerald/10 text-emerald" : "bg-amber-500/10 text-amber-400"
                  )}>
                    {g.onTrack ? "On Track" : "Behind"}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, g.progressPercent)}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gold"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-ink-faint">
                  <span>{g.progressPercent}% complete</span>
                  <span>{g.estimatedMonths > 0 ? `~${g.estimatedMonths}mo remaining` : "Set contribution"}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Debt Forecasts ── */}
      {debtForecasts.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-coral" />
            <h2 className="font-display text-sm font-semibold text-ink">Debt Forecasts</h2>
          </div>

          <div className="space-y-2">
            {debtForecasts.map((d) => (
              <Card key={d.debtId} className="!p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-ink">{d.debtName}</span>
                  <span className="font-mono text-xs text-coral">{formatRupiahCompact(d.totalRemaining)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-ink-faint">
                  <span>{d.monthsRemaining > 0 ? `${d.monthsRemaining}mo to payoff` : "Paid off"}</span>
                  {d.nextPayment && (
                    <span>Next: {formatRupiahCompact(d.nextPayment.amount)} on {d.nextPayment.dueDate.slice(5)}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Overspending Alerts ── */}
      {alerts.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-amber-400" />
            <h2 className="font-display text-sm font-semibold text-ink">Overspending Alerts</h2>
          </div>

          <div className="space-y-2">
            {alerts.map((a) => (
              <motion.div
                key={a.category}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: a.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink">{a.label}</p>
                  <p className="text-[10px] text-ink-faint">
                    {formatRupiahCompact(a.currentSpend)} / avg {formatRupiahCompact(a.averageSpend)}
                  </p>
                </div>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                  +{a.overagePercent}%
                </span>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Merchant Analysis ── */}
      {merchants.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Store size={16} className="text-purple-400" />
            <h2 className="font-display text-sm font-semibold text-ink">Top Merchants</h2>
          </div>

          <Card>
            <div className="space-y-2.5">
              {merchants.slice(0, 6).map((m, i) => (
                <div key={m.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bg text-[10px] font-bold text-ink-faint">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{m.name}</p>
                    <p className="text-[10px] text-ink-faint">{m.transactionCount}x · avg {formatRupiahCompact(m.avgPerVisit)}</p>
                  </div>
                  <span className="font-mono text-xs text-ink-muted">{formatRupiahCompact(m.totalSpent)}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <BottomNav />
    </main>
  );
}

function RecommendationCard({ rec, index }: { rec: AdvisorRecommendation; index: number }) {
  const styles = SEVERITY_STYLES[rec.severity];

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={clsx(
        "rounded-xl border p-4 transition",
        styles.bg, styles.border,
        rec.actionHref && "hover:border-opacity-50 cursor-pointer"
      )}
    >
      <div className="flex items-start gap-3">
        <SeverityIcon severity={rec.severity} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">{rec.title}</p>
          <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{rec.message}</p>
        </div>
        {rec.actionHref && <ChevronRight size={14} className="text-ink-faint mt-0.5 shrink-0" />}
      </div>
    </motion.div>
  );

  if (rec.actionHref) {
    return <Link href={rec.actionHref}>{content}</Link>;
  }
  return content;
}
