"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { scanReceipt } from "@/lib/engine/ocrEngine";
import { PageHeader } from "@/components/ui/PageHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { Card } from "@/components/ui/Card";
import { CATEGORY_LIST } from "@/lib/engine/categoryDetector";
import { formatNumberID } from "@/lib/utils/currency";
import type { CategoryId, ReceiptScanResult } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Check, RotateCcw, ScanLine, AlertCircle } from "lucide-react";
import { clsx } from "clsx";

type ScanState = "idle" | "scanning" | "result" | "error";

export default function ScanPage() {
  const hydrated = useHydrated();
  const addTransaction = useAppStore((s) => s.addTransaction);

  // ── Capacitor safe-mount guard ───────────────────────────────────────
  // On iOS/Capacitor (capacitor://localhost), top-level component rendering
  // can attempt to resolve relative asset paths (tessdata/, worker scripts)
  // before the client JS runtime is fully bootstrapped, causing a blank
  // black screen. We gate ALL scanner UI behind this flag so nothing
  // browser-specific executes until useEffect confirms we're on the client.
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ReceiptScanResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Editable fields
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<CategoryId>("other");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setScanState("scanning");
    // Revoke previous blob URL to prevent native heap leak
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const scanResult = await scanReceipt(file);
      setResult(scanResult);
      setMerchant(scanResult.merchant);
      setAmount(scanResult.amount > 0 ? String(scanResult.amount) : "");
      setDate(scanResult.date);
      setCategory(scanResult.category);
      setScanState("result");
    } catch {
      setScanState("error");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  function handleSave() {
    const parsedAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!parsedAmount || parsedAmount <= 0) return;

    addTransaction({
      amount: parsedAmount,
      kind: "expense",
      category,
      merchant: merchant || undefined,
      source: "receipt-scan",
      date: date || undefined,
      items: result?.items,
    });

    resetState();
  }

  function resetState() {
    setScanState("idle");
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setResult(null);
    setMerchant("");
    setAmount("");
    setDate("");
    setCategory("other");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function handleRescan() {
    // Fully dehydrate the scanner so NO data from the prior scan session can leak
    // into the next one. Empty ALL scanner state first, switch the view LAST.
    setResult(null);          // clears itemized breakdown (items) + confidence source
    setMerchant("");          // clear merchant input
    setAmount("");            // clear parsed total amount
    setDate("");              // clear date input
    setCategory("other");     // reset category selection
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    setScanState("idle");     // transition back to capture mode AFTER state is emptied
  }

  // Revoke any lingering blob URL on unmount to free native heap memory
  useEffect(() => {
    return () => {
      setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, []);

  // ── Pre-mount fallback (Capacitor / SSR) ─────────────────────────────
  if (!isClient || !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold" />
          <p className="p-4 text-sm text-white/60">Loading scanner…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <PageHeader title="Receipt Scanner" subtitle="Snap, scan, and log expenses" />

      <AnimatePresence mode="wait">
        {scanState === "idle" && (
          <motion.div
            key="uploader"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={clsx(
                "flex flex-col items-center justify-center gap-4 rounded-xl2 border-2 border-dashed p-12 text-center transition-all",
                isDragging
                  ? "border-gold bg-gold/5 scale-[1.02]"
                  : "border-border-soft bg-bg-raised hover:border-gold/30"
              )}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
                <Upload size={28} className="text-gold" />
              </div>
              <div>
                <p className="font-medium text-ink">Drop receipt image here</p>
                <p className="mt-1 text-sm text-ink-muted">or use the buttons below</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-border-soft bg-bg-raised px-4 py-3.5 font-medium text-ink transition hover:border-gold/30 hover:text-gold"
              >
                <Camera size={18} />
                Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-border-soft bg-bg-raised px-4 py-3.5 font-medium text-ink transition hover:border-gold/30 hover:text-gold"
              >
                <Upload size={18} />
                Upload
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </motion.div>
        )}

        {scanState === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-8"
          >
            {previewUrl && (
              <div className="relative overflow-hidden rounded-xl2 border border-border-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Receipt preview" className="max-h-64 w-full object-cover" />
                <motion.div
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent"
                  initial={{ top: 0 }}
                  animate={{ top: "100%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <ScanLine size={20} className="animate-pulse text-gold" />
              <span className="font-medium text-ink-muted">Scanning receipt…</span>
            </div>
          </motion.div>
        )}

        {scanState === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {previewUrl && (
              <div className="overflow-hidden rounded-xl2 border border-border-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Receipt" className="max-h-48 w-full object-cover" />
              </div>
            )}

            {scanState === "result" && result?.items && result.items.length > 0 && (
              <div className="aero-glass border-[0.5px] border-white/10 rounded-2xl p-4 mt-4 font-mono text-xs">
                <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/40">
                  <span>Item Breakdown</span>
                  <span>{result.items.length} items</span>
                </div>
                <div className="space-y-2">
                  {result.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3">
                      <span className="text-white/60">
                        {item.name} <span className="text-white/35">x{item.qty}</span>
                      </span>
                      <span className="tabular-nums text-white/90">Rp {formatNumberID(item.price)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="uppercase tracking-wider text-white/50">Total</span>
                  <span className="tabular-nums font-semibold text-white">
                    Rp {formatNumberID((result.items ?? []).reduce((sum, it) => sum + it.price, 0))}
                  </span>
                </div>
              </div>
            )}

            {/* Confidence Score */}
            <div className="flex items-center justify-between rounded-xl border border-border-soft bg-bg-raised px-4 py-3">
              <span className="text-sm text-ink-muted">Confidence</span>
              <span className={clsx(
                "font-mono text-sm font-semibold",
                result.confidence >= 70 ? "text-emerald" : result.confidence >= 40 ? "text-gold" : "text-coral"
              )}>
                {result.confidence}%
              </span>
            </div>

            {/* Editable Fields */}
            <Card>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-muted">Merchant</label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-ink focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-muted">Amount (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-border bg-bg px-4 py-3 font-mono text-ink focus:border-gold focus:outline-none"
                  />
                  {amount && Number(amount.replace(/\D/g, "")) > 0 && (
                    <p className="mt-1 text-xs text-ink-faint">Rp{formatNumberID(Number(amount.replace(/\D/g, "")))}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-muted">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-ink focus:border-gold focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-muted">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_LIST.filter((c) => c.id !== "savings").map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className={clsx(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          category === c.id
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-border-soft text-ink-muted hover:border-border"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleRescan}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-soft py-3 font-medium text-ink-muted transition hover:border-border hover:text-ink"
              >
                <RotateCcw size={16} />
                Re-scan
              </button>
              <button
                onClick={handleSave}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold py-3 font-medium text-bg transition hover:bg-gold/90"
              >
                <Check size={18} />
                Save
              </button>
            </div>
          </motion.div>
        )}

        {scanState === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 py-12 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral/10">
              <AlertCircle size={28} className="text-coral" />
            </div>
            <p className="font-medium text-ink">Scanning failed</p>
            <p className="text-sm text-ink-muted">The image couldn&apos;t be processed. Try a clearer photo.</p>
            <button
              onClick={resetState}
              className="flex items-center gap-2 rounded-xl border border-border-soft px-6 py-3 font-medium text-ink transition hover:border-gold/30"
            >
              <RotateCcw size={16} />
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </main>
  );
}
