import { detectCategory } from "@/lib/engine/categoryDetector";
import type { CategoryId, ReceiptItem, ReceiptScanResult } from "@/lib/types";

/**
 * Receipt scanner pipeline.
 *
 *   Vision API  →  on-device Tesseract  →  hard failure
 *
 * The hosted Vision endpoint (`/api/ocr`) is tried first because it produces
 * structured items + totals. If it's unavailable (no provider key configured,
 * non-2xx response, offline), we fall through to the on-device Tesseract
 * pipeline, which extracts the merchant / total / date heuristically. If both
 * fail, scanReceipt() throws — the UI surfaces its "Try again" error state.
 *
 * NOTE: there is no hardcoded "Pop Mie / Kanzler / 75.400" mock fallback. The
 * previous version returned that dataset whenever OCR was slow or blocked,
 * which made the scanner appear to "work" with completely fabricated data.
 */

// ---------------------------------------------------------------------------
// Vision API client (preferred path)
// ---------------------------------------------------------------------------

interface VisionApiResponse {
  provider: string;
  merchant: string;
  items: ReceiptItem[];
  totalAmount: number;
  date: string;
  currency: "IDR";
  rawText: string;
  confidence: number;
  error?: string;
}

async function scanWithVisionApi(image: File | Blob): Promise<ReceiptScanResult> {
  // Convert Blob to a File so the server can read a sensible filename / type.
  const file =
    image instanceof File
      ? image
      : new File([image], "receipt.jpg", { type: image.type || "image/jpeg" });

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/ocr", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string };
      detail = body.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(
      detail || `Vision API responded with HTTP ${response.status}.`,
    );
  }

  const payload = (await response.json()) as VisionApiResponse;
  const merchant = payload.merchant?.trim() || "Unknown merchant";
  const items: ReceiptItem[] = Array.isArray(payload.items) ? payload.items : [];
  const totalAmount =
    Number.isFinite(payload.totalAmount) && payload.totalAmount > 0
      ? Math.round(payload.totalAmount)
      : items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

  if (!totalAmount) {
    throw new Error("Vision API returned a receipt with no total amount.");
  }

  const category = detectCategoryFromReceipt(
    `${merchant}\n${items.map((it) => it.name).join("\n")}\n${payload.rawText ?? ""}`,
    merchant,
  );

  return {
    merchant,
    amount: totalAmount,
    date: payload.date && /^\d{4}-\d{2}-\d{2}$/.test(payload.date) ? payload.date : todayIso(),
    category,
    confidence: Math.max(0, Math.min(100, Math.round(payload.confidence ?? 0))),
    rawText: payload.rawText ?? "",
    items: items.length > 0 ? items : undefined,
  };
}

// ---------------------------------------------------------------------------
// On-device Tesseract fallback
// ---------------------------------------------------------------------------

interface ExtractionResult {
  merchant: string;
  amount: number;
  date: string;
  confidence: number;
}

const AMOUNT_PATTERNS = [
  /(?:total|jumlah|grand\s*total|bayar|ttl)\s*[:\s]*(?:rp\.?\s*)?([0-9][0-9.,]*)/i,
  /(?:rp\.?\s*)([0-9][0-9.,]{3,})/i,
  /([0-9]{1,3}(?:[.,][0-9]{3})+)/,
];

const DATE_PATTERNS = [
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
  /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
  /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{2,4})/i,
];

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function extractAmount(text: string): { amount: number; confidence: number } {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const cleaned = match[1].replace(/[.,]/g, "");
      const amount = parseInt(cleaned, 10);
      if (amount > 0 && amount < 100_000_000) {
        const patternIdx = AMOUNT_PATTERNS.indexOf(pattern);
        const confidence = patternIdx === 0 ? 0.95 : patternIdx === 1 ? 0.8 : 0.6;
        return { amount, confidence };
      }
    }
  }
  return { amount: 0, confidence: 0 };
}

function extractDate(text: string): { date: string; confidence: number } {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      try {
        let year: string, month: string, day: string;

        if (/^\d{4}$/.test(match[1] ?? "")) {
          year = match[1] ?? "";
          month = (match[2] ?? "").padStart(2, "0");
          day = (match[3] ?? "").padStart(2, "0");
        } else if (MONTH_MAP[(match[2] ?? "").toLowerCase().slice(0, 3)]) {
          day = (match[1] ?? "").padStart(2, "0");
          month = MONTH_MAP[(match[2] ?? "").toLowerCase().slice(0, 3)] ?? "01";
          year = match[3] ?? "";
          if (year.length === 2) year = `20${year}`;
        } else {
          day = (match[1] ?? "").padStart(2, "0");
          month = (match[2] ?? "").padStart(2, "0");
          year = match[3] ?? "";
          if (year.length === 2) year = `20${year}`;
        }

        const dateStr = `${year}-${month}-${day}`;
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return { date: dateStr, confidence: 0.85 };
        }
      } catch {
        /* try next pattern */
      }
    }
  }
  return { date: todayIso(), confidence: 0.3 };
}

function extractMerchant(text: string): { merchant: string; confidence: number } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] ?? "";
  if (firstLine.length > 2 && !/^\d+[\/\-]/.test(firstLine)) {
    return { merchant: firstLine.slice(0, 50), confidence: 0.7 };
  }
  const secondLine = lines[1] ?? "";
  if (secondLine.length > 2) {
    return { merchant: secondLine.slice(0, 50), confidence: 0.5 };
  }
  return { merchant: "Unknown merchant", confidence: 0.2 };
}

function extractAll(text: string): ExtractionResult {
  const amountResult = extractAmount(text);
  const dateResult = extractDate(text);
  const merchantResult = extractMerchant(text);
  const avgConfidence =
    (amountResult.confidence + dateResult.confidence + merchantResult.confidence) / 3;
  return {
    merchant: merchantResult.merchant,
    amount: amountResult.amount,
    date: dateResult.date,
    confidence: Math.round(avgConfidence * 100),
  };
}

function detectCategoryFromReceipt(text: string, merchant: string): CategoryId {
  const fromText = detectCategory(text);
  if (fromText !== "other") return fromText;
  return detectCategory(merchant);
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Tesseract pipeline with an abortable timeout
// ---------------------------------------------------------------------------

const OCR_TIMEOUT_MS = 15_000;

interface OcrRunControl {
  signal: AbortSignal;
  registerWorker: (worker: { terminate: () => Promise<unknown> }) => void;
}

function withAbortableTimeout<T>(
  workFactory: (control: OcrRunControl) => Promise<T>,
  ms: number,
): Promise<T> {
  const controller = new AbortController();
  const workers = new Set<{ terminate: () => Promise<unknown> }>();
  let settled = false;

  const terminateWorkers = () => {
    for (const worker of workers) void worker.terminate().catch(() => {});
    workers.clear();
  };

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      controller.abort();
      terminateWorkers();
      reject(new Error("OCR_TIMEOUT"));
    }, ms);

    const work = workFactory({
      signal: controller.signal,
      registerWorker: (worker) => {
        if (controller.signal.aborted || settled) {
          void worker.terminate().catch(() => {});
          return;
        }
        workers.add(worker);
      },
    });

    work.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        workers.clear();
        resolve(value);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        terminateWorkers();
        reject(err);
      },
    );
  });
}

async function scanWithTesseract(image: File | Blob): Promise<ReceiptScanResult> {
  return withAbortableTimeout(async (control) => {
    if (control.signal.aborted) throw new Error("OCR_ABORTED");

    const { createWorker } = await import("tesseract.js");
    if (control.signal.aborted) throw new Error("OCR_ABORTED");

    const worker = await createWorker("ind+eng", undefined, {
      langPath: "/tessdata",
      logger: () => {},
    });
    control.registerWorker(worker);

    try {
      if (control.signal.aborted) throw new Error("OCR_ABORTED");
      const { data } = await worker.recognize(image);
      if (control.signal.aborted) throw new Error("OCR_ABORTED");

      const rawText = data.text ?? "";
      const extraction = extractAll(rawText);
      if (!extraction.amount || extraction.amount <= 0) {
        throw new Error("Receipt text was unreadable — no total found.");
      }

      const category = detectCategoryFromReceipt(rawText, extraction.merchant);
      return {
        merchant: extraction.merchant,
        amount: extraction.amount,
        date: extraction.date || todayIso(),
        category,
        confidence: extraction.confidence,
        rawText,
      };
    } finally {
      await worker.terminate().catch(() => {});
    }
  }, OCR_TIMEOUT_MS);
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export async function scanReceipt(imageFile: File | Blob): Promise<ReceiptScanResult> {
  // 1) Preferred: hosted Vision API. Bubbles up errors so we can fall back.
  try {
    return await scanWithVisionApi(imageFile);
  } catch (visionErr) {
    // Vision is unavailable (no key, 501, network, etc.) — try local Tesseract.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[ocrEngine] Vision API failed, falling back to Tesseract:", visionErr);
    }
  }

  // 2) Fallback: on-device Tesseract. Throws on failure — no mock data.
  return scanWithTesseract(imageFile);
}

export async function scanReceiptFromUrl(dataUrl: string): Promise<ReceiptScanResult> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return scanReceipt(blob);
}
