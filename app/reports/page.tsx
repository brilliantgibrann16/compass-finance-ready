"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { PageLayout } from "@/components/ui/PageLayout";
import { Card } from "@/components/ui/Card";
import { formatRupiah, formatRupiahCompact } from "@/lib/utils/currency";
import {
  getMonthlyReport,
  getAvailableMonths,
  type MonthlyReport,
} from "@/lib/engine/analyticsEngine";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, ChevronDown, TrendingUp, TrendingDown,
  Store, Tag, PieChart, BarChart3,
} from "lucide-react";
import { clsx } from "clsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export default function ReportsPage() {
  const hydrated = useHydrated();
  const transactions = useAppStore((s) => s.transactions);

  const availableMonths = useMemo(() => getAvailableMonths(transactions), [transactions]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const selected = availableMonths[selectedIdx];
  const report: MonthlyReport | null = useMemo(() => {
    if (!selected) return null;
    return getMonthlyReport(transactions, selected.year, selected.month);
  }, [transactions, selected]);

  const handleExportPdf = useCallback(async () => {
    if (!reportRef.current || !report) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#0B0E14", scale: 2, useCORS: true, logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const finalHeight = Math.min(imgHeight, pageHeight - 20);
      const finalWidth = imgHeight > pageHeight - 20 ? (canvas.width * finalHeight) / canvas.height : imgWidth;
      pdf.addImage(imgData, "PNG", 10, 10, finalWidth, finalHeight);
      pdf.save(`compass-report-${report.month}.pdf`);
    } catch {
      window.print();
    } finally {
      setExporting(false);
    }
  }, [report]);

  if (!hydrated) return <LoadingScreen />;

  if (availableMonths.length === 0 || !report) {
    return (
      <PageLayout title="Reports" subtitle="Monthly financial summaries">
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <FileText size={48} className="text-ink-faint" />
          <p className="text-ink-muted">No transaction data yet</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Reports" subtitle="Monthly financial summaries">

      {/* Month Picker */}
      <div className="relative mb-5">
        <button onClick={() => setShowMonthPicker(!showMonthPicker)} className="flex w-full items-center justify-between rounded-xl border border-border-soft bg-bg-raised px-4 py-3 transition hover:border-gold/30">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-gold" />
            <span className="font-display font-semibold text-ink">{report.monthLabel}</span>
          </div>
          <ChevronDown size={16} className={clsx("text-ink-faint transition", showMonthPicker && "rotate-180")} />
        </button>
        <AnimatePresence>
          {showMonthPicker && (
            <motion.div initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -4, height: 0 }} className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border-soft bg-bg-raised shadow-xl">
              <div className="max-h-48 overflow-y-auto p-1">
                {availableMonths.map((m, i) => (
                  <button key={m.label} onClick={() => { setSelectedIdx(i); setShowMonthPicker(false); }} className={clsx("w-full rounded-lg px-3 py-2 text-left text-sm transition", i === selectedIdx ? "bg-gold/10 text-gold" : "text-ink-muted hover:bg-bg hover:text-ink")}>
                    {m.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-emerald/20 bg-emerald/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-emerald" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald/70">Income</span>
            </div>
            <p className="font-mono text-lg font-bold text-emerald">{formatRupiahCompact(report.totalIncome)}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-coral/20 bg-coral/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={14} className="text-coral" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-coral/70">Expense</span>
            </div>
            <p className="font-mono text-lg font-bold text-coral">{formatRupiahCompact(report.totalExpense)}</p>
          </motion.div>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-muted">Net Savings</span>
            <span className={clsx("font-mono text-lg font-bold", report.netSavings >= 0 ? "text-emerald" : "text-coral")}>
              {report.netSavings >= 0 ? "+" : ""}{formatRupiah(report.netSavings)}
            </span>
          </div>
          {report.savingsRate !== 0 && (
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, report.savingsRate))}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={clsx("h-full rounded-full", report.savingsRate >= 20 ? "bg-emerald" : report.savingsRate >= 0 ? "bg-gold" : "bg-coral")} />
            </div>
          )}
          <p className="mt-1 text-[10px] text-ink-faint text-right">
            Savings rate: {report.savingsRate}% · {report.transactionCount} transactions
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {report.biggestCategory && (
            <Card className="!p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Tag size={12} className="text-gold" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Top Category</span>
              </div>
              <p className="font-display text-sm font-semibold text-ink">{report.biggestCategory.label}</p>
              <p className="font-mono text-xs text-ink-muted">{formatRupiahCompact(report.biggestCategory.amount)}</p>
            </Card>
          )}
          {report.topMerchant && (
            <Card className="!p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Store size={12} className="text-purple-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Top Merchant</span>
              </div>
              <p className="font-display text-sm font-semibold text-ink truncate">{report.topMerchant.name}</p>
              <p className="font-mono text-xs text-ink-muted">{formatRupiahCompact(report.topMerchant.amount)} · {report.topMerchant.count}x</p>
            </Card>
          )}
        </div>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-gold" />
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Daily Spending</h3>
          </div>
          <div className="h-36 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.dailyTrend} barCategoryGap="8%">
                <XAxis dataKey="label" tick={{ fill: "#5A6478", fontSize: 8 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis hide />
                <Tooltip contentStyle={{ backgroundColor: "#151921", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11 }} formatter={(value: number) => [formatRupiah(value), "Spent"]} />
                <Bar dataKey="expense" radius={[3, 3, 0, 0]} maxBarSize={12}>
                  {report.dailyTrend.map((entry, i) => (
                    <Cell key={i} fill={entry.expense > 0 ? "#F0B429" : "rgba(240,180,41,0.1)"} fillOpacity={entry.expense > 0 ? 0.8 : 0.2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <PieChart size={14} className="text-purple-400" />
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Category Breakdown</h3>
          </div>
          {report.categoryBreakdown.length === 0 ? (
            <p className="text-center text-sm text-ink-faint py-4">No expenses</p>
          ) : (
            <div className="space-y-2">
              {report.categoryBreakdown.map((c) => (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="flex-1 text-xs text-ink">{c.label}</span>
                  <span className="font-mono text-xs text-ink-muted">{formatRupiahCompact(c.amount)}</span>
                  <div className="w-16 h-1.5 rounded-full bg-bg overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.percentage}%`, backgroundColor: c.color }} />
                  </div>
                  <span className="w-8 text-right font-mono text-[10px] text-ink-faint">{c.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Export PDF Button */}
      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={handleExportPdf} disabled={exporting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 font-display font-semibold text-bg transition hover:bg-gold/90 disabled:opacity-50">
        {exporting ? (
          <><div className="h-4 w-4 animate-spin rounded-full border-2 border-bg border-t-transparent" />Generating PDF...</>
        ) : (
          <><Download size={18} />Export as PDF</>
        )}
      </motion.button>

    </PageLayout>
  );
}
