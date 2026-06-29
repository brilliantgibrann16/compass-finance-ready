import { NextRequest, NextResponse } from "next/server";

/**
 * /api/ocr — Server-side Vision API endpoint for receipt scanning.
 *
 * The client POSTs `multipart/form-data` with a single `image` field. We
 * forward the image to the configured Vision provider and return a
 * normalized JSON payload:
 *
 *   {
 *     merchant:    string,
 *     items:       { name: string; qty: number; price: number }[],
 *     totalAmount: number,
 *     date:        string,   // ISO yyyy-mm-dd
 *     currency:    "IDR",
 *     rawText:     string,
 *     confidence:  number    // 0–100
 *   }
 *
 * Provider is selected via env:
 *   - `OCR_PROVIDER=openai`  → GPT-4o / gpt-4o-mini vision (default if OPENAI_API_KEY set)
 *   - `OCR_PROVIDER=google`  → Google Cloud Vision (requires GOOGLE_VISION_API_KEY)
 *   - else                    → 501 (the client falls back to local Tesseract)
 *
 * No mock receipts are ever returned from here. If the provider call fails,
 * we surface the failure so the client can show its real "Try again" UI.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

interface ParsedReceiptItem {
  name: string;
  qty: number;
  price: number;
}

interface NormalizedReceipt {
  merchant: string;
  items: ParsedReceiptItem[];
  totalAmount: number;
  date: string;
  currency: "IDR";
  rawText: string;
  confidence: number;
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toBase64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64");
}

// ---------------------------------------------------------------------------
// Provider: OpenAI Vision (gpt-4o-mini)
// ---------------------------------------------------------------------------

async function parseWithOpenAI(
  imageBytes: ArrayBuffer,
  mimeType: string,
): Promise<NormalizedReceipt> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const dataUrl = `data:${mimeType};base64,${toBase64(imageBytes)}`;
  const prompt = [
    "You are a receipt-parsing API. The user uploads a photo of an Indonesian retail receipt.",
    "Read the image and return STRICT JSON (no prose, no markdown) with this exact shape:",
    "{",
    '  "merchant": string,',
    '  "items": [{ "name": string, "qty": number, "price": number }],',
    '  "totalAmount": number,',
    '  "date": "YYYY-MM-DD",',
    '  "currency": "IDR",',
    '  "confidence": number  // 0..100',
    "}",
    "Rules:",
    "- `price` is the LINE TOTAL for that item, in IDR (integer rupiah, no thousands separators).",
    "- `totalAmount` is the receipt grand total in IDR (integer).",
    "- If the date is missing, use today's date.",
    "- If you cannot read the receipt confidently, set confidence below 30 and items=[].",
    "- Never invent items that aren't visible in the image.",
  ].join("\n");

  const baseUrl = (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_OCR_MODEL || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`OpenAI Vision request failed (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = payload.choices?.[0]?.message?.content ?? "{}";
  return normalizeProviderJson(raw);
}

// ---------------------------------------------------------------------------
// Provider: Google Cloud Vision (TEXT_DETECTION)
// ---------------------------------------------------------------------------

async function parseWithGoogleVision(
  imageBytes: ArrayBuffer,
): Promise<NormalizedReceipt> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_VISION_API_KEY is not set");

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: toBase64(imageBytes) },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Google Vision request failed (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    responses?: Array<{
      fullTextAnnotation?: { text?: string };
    }>;
  };
  const text = data.responses?.[0]?.fullTextAnnotation?.text ?? "";
  return extractFromPlainText(text);
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function normalizeProviderJson(raw: string): NormalizedReceipt {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Some providers wrap JSON in code fences; strip and retry once.
    const stripped = raw.replace(/^```(?:json)?\s*|\s*```$/g, "");
    parsed = JSON.parse(stripped);
  }
  const obj = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;

  const merchant = typeof obj.merchant === "string" ? obj.merchant.trim() : "";
  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  const items: ParsedReceiptItem[] = rawItems
    .map((it) => {
      const r = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
      return {
        name: typeof r.name === "string" ? r.name.trim() : "",
        qty: Number.isFinite(Number(r.qty)) ? Math.max(1, Math.round(Number(r.qty))) : 1,
        price: Number.isFinite(Number(r.price)) ? Math.max(0, Math.round(Number(r.price))) : 0,
      };
    })
    .filter((it) => it.name.length > 0 && it.price > 0);

  const reportedTotal = Number(obj.totalAmount);
  const totalAmount =
    Number.isFinite(reportedTotal) && reportedTotal > 0
      ? Math.round(reportedTotal)
      : items.reduce((sum, it) => sum + it.price, 0);

  const date = typeof obj.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(obj.date) ? obj.date : todayIso();

  const confidenceRaw = Number(obj.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(100, Math.round(confidenceRaw)))
    : items.length > 0
      ? 75
      : 0;

  return {
    merchant: merchant || "Unknown merchant",
    items,
    totalAmount,
    date,
    currency: "IDR",
    rawText: raw,
    confidence,
  };
}

const AMOUNT_LINE_RE =
  /(?:total|grand\s*total|jumlah|bayar|ttl)\s*[:\s]*(?:rp\.?\s*)?([0-9][0-9.,]*)/i;
const DATE_RE = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;

function extractFromPlainText(text: string): NormalizedReceipt {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const merchant = lines[0]?.slice(0, 64) ?? "Unknown merchant";
  const amountMatch = text.match(AMOUNT_LINE_RE);
  const totalAmount = amountMatch?.[1]
    ? parseInt(amountMatch[1].replace(/[.,]/g, ""), 10) || 0
    : 0;

  let date = todayIso();
  const dateMatch = text.match(DATE_RE);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, "0");
    const month = dateMatch[2].padStart(2, "0");
    let year = dateMatch[3];
    if (year.length === 2) year = `20${year}`;
    const candidate = `${year}-${month}-${day}`;
    if (!isNaN(new Date(candidate).getTime())) date = candidate;
  }

  return {
    merchant,
    items: [],
    totalAmount,
    date,
    currency: "IDR",
    rawText: text,
    confidence: totalAmount > 0 ? 60 : 20,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

function pickProvider(): "openai" | "google" | "none" {
  const explicit = process.env.OCR_PROVIDER?.toLowerCase();
  if (explicit === "openai" || explicit === "google") return explicit;
  if (process.env.OPENAI_API_KEY || process.env.OPENAI_API_BASE) return "openai";
  if (process.env.GOOGLE_VISION_API_KEY) return "google";
  return "none";
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with an `image` field." },
      { status: 400 },
    );
  }

  const file = formData.get("image");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "`image` field is required and must be a file." },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty image upload." }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image is larger than 8MB." }, { status: 413 });
  }

  const provider = pickProvider();
  if (provider === "none") {
    // No provider configured. Return 501 so the client knows to fall back to
    // its on-device Tesseract path — we NEVER return mock data here.
    return NextResponse.json(
      {
        error: "No Vision provider configured. Set OPENAI_API_KEY or GOOGLE_VISION_API_KEY.",
        provider: "none",
      },
      { status: 501 },
    );
  }

  const arrayBuf = await file.arrayBuffer();
  const mimeType = file.type || "image/jpeg";

  try {
    const result =
      provider === "openai"
        ? await parseWithOpenAI(arrayBuf, mimeType)
        : await parseWithGoogleVision(arrayBuf);
    return NextResponse.json({ provider, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vision provider failed.";
    return NextResponse.json({ error: message, provider }, { status: 502 });
  }
}
