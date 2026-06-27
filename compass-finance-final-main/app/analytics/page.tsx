"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { PageHeader } from "@/components/ui/PageHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { Card } from "@/components/ui/Card";
import { formatRupiah, formatRupiahCompact } from "@/lib/utils/currency";
import {
  getDailyTrend,
  get7DaySpending,
  get30DaySpending,
  getMonthlySpending,
  getCategoryBreakdown,
  getIncomeExpenseSummary,
} from "@/lib/engine/analyticsEngine";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingDown, TrendingUp, Calendar, ArrowRight,
  Wallet, PieChart, BarChart3, Activity,
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart as RePieChart, Pie,
} from "recharts";

type TimeRange = "7d" | "30d" | "month";

export default function AnalyticsPage() {
  const hydrated = useHydrated();
  const transactions = useAppStore((s) => s.transactions);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const { t } = useTranslation();

  const today = useMemo(() => new Date(), []);
  const spend7d = useMemo(() => get7DaySpending(transactions, today), [transactions, today]);
  const spend30d = useMemo(() => get30DaySpending(transactions, today), [transactions, today]);
  const spendMonth = useMemo(() => getMonthlySpending(transactions, today), [transactions, today]);

  const days = timeRange === "7d" ? 7 : 30;
  const dailyTrend = useMemo(() => getDailyTrend(transactions, days, today), [transactions, days, today]);
  const categories = useMemo(() => getCategoryBreakdown(transactions, "expense"), [transactions]);
  const summary = useMemo(() => getIncomeExpenseSummary(transactions), [transactions]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold" />
      </div>
    );
  }

  const spendingCards = [
    { label: "7 days", value: spend7d, icon: Activity, accent: "text-sky-400" },
    { label: "30 days", value: spend30d, icon: Calendar, accent: "text-purple-400" },
    { label: "This month", value: spendMonth, icon: Wallet, accent: "text-gold" },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <PageHeader title={t("analytics")} subtitle={t("analyticsDesc")} />

      {/* Spending Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {spendingCards.map((c) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-border-soft bg-bg-raised p-3 text-center"
          >
            <c.icon size={16} className={clsx("mx-auto mb-1", c.accent)} />
            <p className="font-mono text-sm font-semibold text-ink">{formatRupiahCompact(c.value)}</p>
            <p className="text-[10px] text-ink-faint">{c.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Spending Trend Chart */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-gold" />
            <h2 className="font-display text-sm font-semibold text-ink">Spending Trend</h2>
          </div>
          <div className="flex rounded-lg border border-border-soft">
            {(["7d", "30d", "month"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={clsx(
                  "px-2.5 py-1 text-[10px] font-semibold transition",
                  timeRange === r ? "bg-gold/10 text-gold" : "text-ink-faint hover:text-ink-muted"
                )}
              >
                {r === "7d" ? "7D" : r === "30d" ? "30D" : "MTD"}
              </button>
            ))}
          </div>
        </div>
        <div className="h-44 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyTrend} barCategoryGap="15%">
              <XAxis dataKey="label" tick={{ fill: "#5A6478", fontSize: 9 }} axisLine={false} tickLine={false} interval={timeRange === "7d" ? 0 : 4} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: "#151921", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11 }}
                labelStyle={{ color: "#8A93A6" }}
                formatter={(value: number) => [formatRupiah(value), "Spent"]}
              />
              <Bar dataKey="expense" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {dailyTrend.map((entry, i) => (
                  <Cell key={i} fill={entry.expense > 0 ? "#F0B429" : "rgba(240,180,41,0.15)"} fillOpacity={entry.expense > 0 ? 0.85 : 0.3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Income vs Expense */}
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <PieChart size={16} className="text-emerald" />
          <h2 className="font-display text-sm font-semibold text-ink">Income vs Expense</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald/20 bg-emerald/5 p-3.5 text-center">
            <TrendingUp size={18} className="mx-auto mb-1.5 text-emerald" />
            <p className="font-mono text-base font-bold text-emerald">{formatRupiahCompact(summary.totalIncome)}</p>
            <p className="text-[10px] text-ink-faint mt-0.5">Total Income</p>
          </div>
          <div className="rounded-xl border border-coral/20 bg-coral/5 p-3.5 text-center">
            <TrendingDown size={18} className="mx-auto mb-1.5 text-coral" />
            <p className="font-mono text-base font-bold text-coral">{formatRupiahCompact(summary.totalExpense)}</p>
            <p className="text-[10px] text-ink-faint mt-0.5">Total Expense</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border-soft bg-bg px-4 py-2.5">
          <span className="text-xs text-ink-muted">Net Savings</span>
          <span className={clsx("font-mono text-sm font-semibold", summary.net >= 0 ? "text-emerald" : "text-coral")}>
            {summary.net >= 0 ? "+" : ""}{formatRupiahCompact(summary.net)}
          </span>
        </div>
        {summary.savingsRate !== 0 && (
          <p className="mt-1.5 text-center text-[10px] text-ink-faint">
            Savings rate: <span className={summary.savingsRate >= 0 ? "text-emerald" : "text-coral"}>{summary.savingsRate}%</span>
          </p>
        )}
      </Card>

      {/* Category Breakdown */}
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <PieChart size={16} className="text-purple-400" />
          <h2 className="font-display text-sm font-semibold text-ink">By Category</h2>
        </div>
        {categories.length === 0 ? (
          <p className="text-center text-sm text-ink-faint py-6">No expense data yet</p>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="h-32 w-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={categories} dataKey="amount" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} stroke="none">
                      {categories.map((c, i) => (<Cell key={i} fill={c.color} />))}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {categories.map((c, i) => (
                  <motion.div key={c.category} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="flex-1 text-xs text-ink">{c.label}</span>
                    <span className="font-mono text-xs text-ink-muted">{formatRupiahCompact(c.amount)}</span>
                    <span className="w-10 text-right font-mono text-[10px] text-ink-faint">{c.percentage}%</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </Card>

      {/* Link to Reports */}
      <Link href="/reports">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-xl2 border border-gold/20 bg-gradient-to-r from-gold/5 to-transparent px-5 py-4 transition hover:border-gold/40">
          <div>
            <p className="font-display font-semibold text-ink">Monthly Reports</p>
            <p className="text-xs text-ink-muted">Detailed breakdowns & PDF export</p>
          </div>
          <ArrowRight size={18} className="text-gold" />
        </motion.div>
      </Link>

      <BottomNav />
    </main>
  );
}
