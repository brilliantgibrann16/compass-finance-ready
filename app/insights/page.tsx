"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { PageLayout } from "@/components/ui/PageLayout";
import { Card } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import {
  getCategoryBreakdown,
  getDailySpending,
  getMonthlySpending,
  generateInsights,
  type ChartPeriod,
} from "@/lib/engine/insightsEngine";
import { formatNumberID, formatRupiahCompact } from "@/lib/utils/currency";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  PieChart as PieChartIcon, TrendingUp, Zap, AlertTriangle,
  CheckCircle, Star, Award, PiggyBank, BarChart3,
} from "lucide-react";
import { clsx } from "clsx";

const ICON_MAP: Record<string, React.ElementType> = {
  PieChart: PieChartIcon, TrendingUp, Zap, AlertTriangle,
  CheckCircle, Star, Award, PiggyBank, BarChart3,
};

const PERIOD_OPTIONS: { value: ChartPeriod; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const PERIOD_DAYS: Record<ChartPeriod, number> = { "7d": 7, "30d": 30, "90d": 90 };

const INSIGHT_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  info: { bg: "bg-blue-500/5", border: "border-blue-500/20", icon: "text-blue-400" },
  warning: { bg: "bg-coral/5", border: "border-coral/20", icon: "text-coral" },
  success: { bg: "bg-emerald/5", border: "border-emerald/20", icon: "text-emerald" },
  tip: { bg: "bg-gold/5", border: "border-gold/20", icon: "text-gold" },
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="rounded-lg border border-border-soft bg-bg-raised px-3 py-2 text-xs shadow-card">
      <p className="text-ink-muted">{label}</p>
      <p className="font-mono font-semibold text-gold">Rp{formatNumberID(payload[0].value)}</p>
    </div>
  );
}

export default function InsightsPage() {
  const hydrated = useHydrated();
  const [period, setPeriod] = useState<ChartPeriod>("30d");

  const transactions = useAppStore((s) => s.transactions);
  const debts = useAppStore((s) => s.debts);
  const savingsGoals = useAppStore((s) => s.savingsGoals);
  const wishlist = useAppStore((s) => s.wishlist);
  const transferSettings = useAppStore((s) => s.transferSettings);

  if (!hydrated) return <LoadingScreen />;

  const categories = getCategoryBreakdown(transactions, PERIOD_DAYS[period]);
  const dailyData = getDailySpending(transactions, period === "7d" ? 7 : period === "30d" ? 30 : 90);
  const monthlyData = getMonthlySpending(transactions, 6);
  const insights = generateInsights(transactions, debts, savingsGoals, wishlist, transferSettings);

  const totalSpent = categories.reduce((s, c) => s + c.amount, 0);
  const avgDaily = dailyData.length > 0
    ? Math.round(dailyData.reduce((s, d) => s + d.amount, 0) / dailyData.length)
    : 0;
  const biggestDay = dailyData.reduce((max, d) => (d.amount > max.amount ? d : max), dailyData[0] ?? { date: "", label: "", amount: 0 });

  return (
    <PageLayout title="Smart Insights" subtitle="Understand your money">

      {/* Period Selector */}
      <div className="mb-4 flex gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={clsx(
              "flex-1 rounded-xl border py-2 text-sm font-medium transition",
              period === opt.value
                ? "border-gold bg-gold/10 text-gold"
                : "border-border-soft text-ink-muted hover:border-border"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="text-center !p-3">
          <p className="text-[10px] uppercase tracking-wider text-ink-faint">Total spent</p>
          <p className="mt-1 font-display text-lg font-semibold text-ink">
            <AnimatedNumber value={totalSpent} format={(v) => formatRupiahCompact(v)} />
          </p>
        </Card>
        <Card className="text-center !p-3">
          <p className="text-[10px] uppercase tracking-wider text-ink-faint">Avg / day</p>
          <p className="mt-1 font-display text-lg font-semibold text-ink">
            <AnimatedNumber value={avgDaily} format={(v) => formatRupiahCompact(v)} />
          </p>
        </Card>
        <Card className="text-center !p-3">
          <p className="text-[10px] uppercase tracking-wider text-ink-faint">Peak day</p>
          <p className="mt-1 font-display text-lg font-semibold text-coral">
            <AnimatedNumber value={biggestDay.amount} format={(v) => formatRupiahCompact(v)} />
          </p>
        </Card>
      </div>

      {/* Spending Bar Chart */}
      <Card className="mb-4">
        <h3 className="mb-3 font-display font-medium text-ink">
          {period === "7d" ? "Daily" : "Monthly"} Spending
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            {period === "7d" || period === "30d" ? (
              <BarChart data={period === "7d" ? dailyData : monthlyData} barSize={period === "7d" ? 28 : 24}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5B6478" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar dataKey="amount" fill="#F0B429" radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2030" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5B6478" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="amount" stroke="#F0B429" strokeWidth={2.5} dot={{ fill: "#F0B429", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category Breakdown */}
      <Card className="mb-4">
        <h3 className="mb-3 font-display font-medium text-ink">Category Breakdown</h3>
        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">No expenses yet in this period.</p>
        ) : (
          <div className="flex gap-4">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={56}
                    strokeWidth={0}
                  >
                    {categories.map((c) => (
                      <Cell key={c.category} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {categories.slice(0, 5).map((c) => (
                <div key={c.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-ink-muted">{c.label}</span>
                  </div>
                  <span className="font-mono text-xs text-ink-faint">{c.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Dynamic Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-medium text-ink">Insights</h3>
          <AnimatePresence>
            {insights.map((insight, idx) => {
              const style = INSIGHT_STYLES[insight.type] ?? INSIGHT_STYLES.info!;
              const IconComp = ICON_MAP[insight.icon] ?? Zap;
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className={clsx(
                    "flex items-start gap-3 rounded-xl2 border p-4",
                    style.bg, style.border
                  )}
                >
                  <IconComp size={18} className={clsx("mt-0.5 shrink-0", style.icon)} />
                  <p className="text-sm text-ink">{insight.message}</p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

    </PageLayout>
  );
}
