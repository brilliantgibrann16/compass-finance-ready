// lib/engine/__tests__/ocrEngine.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { scanReceipt, scanReceiptFromUrl } from "../ocrEngine";

// Mutable mock state to control the behavior of the mocked tesseract.js worker
let shouldFailToLoad = false;
let mockTextResult = "WARTEG MANDIRI\nPop Mie Ayam x2 26.000\nTOTAL 26.000\n2026-06-15";

vi.mock("tesseract.js", () => {
  return {
    createWorker: async () => {
      if (shouldFailToLoad) {
        throw new Error("Simulated load failure");
      }
      return {
        recognize: async () => {
          return {
            data: {
              text: mockTextResult,
            },
          };
        },
        terminate: async () => {},
      };
    },
  };
});

// Make the Vision API path deterministically fail so Tesseract is exercised
// without making real network calls during tests.
beforeEach(() => {
  shouldFailToLoad = false;
  mockTextResult = "WARTEG MANDIRI\nPop Mie Ayam x2 26.000\nTOTAL 26.000\n2026-06-15";
  // Override global fetch so /api/ocr is never reached during unit tests.
  // (jsdom can't parse the relative URL anyway — return 501 like the real handler.)
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 501,
    json: async () => ({ error: "OCR provider not configured" }),
  } as unknown as Response);
});

describe("OCR Engine", () => {
  describe("scanReceipt — real OCR via Tesseract fallback", () => {
    it("parses merchant and amount when Tesseract returns readable text", async () => {
      const dummyFile = new File(["dummy content"], "warteg.jpg", {
        type: "image/jpeg",
      });
      const result = await scanReceipt(dummyFile);

      expect(result.merchant).toBe("WARTEG MANDIRI");
      expect(result.amount).toBe(26000);
      expect(result.category).toBe("food"); // WARTEG maps to food
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("throws when Tesseract returns text with no valid total (no mock leak)", async () => {
      mockTextResult = "No amount here";
      const dummyFile = new File(["dummy content"], "empty.jpg", {
        type: "image/jpeg",
      });
      await expect(scanReceipt(dummyFile)).rejects.toThrow(
        /unreadable|no total/i
      );
    });

    it("throws when Tesseract fails to load and Vision API is unavailable", async () => {
      shouldFailToLoad = true;
      const dummyFile = new File(["dummy content"], "sari-roti.jpg", {
        type: "image/jpeg",
      });
      // No more silent fallback to Alfamart/Sari Roti/Indomaret fixtures.
      await expect(scanReceipt(dummyFile)).rejects.toBeInstanceOf(Error);
    });
  });

  describe("scanReceiptFromUrl", () => {
    it("fetches a data URL and returns a scan result", async () => {
      const mockBlob = new Blob(["dummy content"], { type: "image/jpeg" });
      const mockResponse = {
        blob: vi.fn().mockResolvedValue(mockBlob),
      };
      const originalFetch = globalThis.fetch;
      // First call (inside scanReceiptFromUrl) returns the blob;
      // subsequent /api/ocr fetch returns 501 so Tesseract path is used.
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockResponse as unknown as Response)
        .mockResolvedValue({
          ok: false,
          status: 501,
          json: async () => ({ error: "OCR provider not configured" }),
        } as unknown as Response);

      try {
        const result = await scanReceiptFromUrl("data:image/jpeg;base64,dummy");
        expect(globalThis.fetch).toHaveBeenCalledWith(
          "data:image/jpeg;base64,dummy"
        );
        expect(result).toBeDefined();
        expect(result.merchant).toBe("WARTEG MANDIRI");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
