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

describe("OCR Engine", () => {
  beforeEach(() => {
    shouldFailToLoad = false;
    mockTextResult = "WARTEG MANDIRI\nPop Mie Ayam x2 26.000\nTOTAL 26.000\n2026-06-15";
  });

  describe("buildMockResult / selectMockDataset (via scanReceipt fallback or File token)", () => {
    it("returns Sari Roti mock result when filename matches sari/roti/alfamart", async () => {
      const dummyFile = new File(["dummy content"], "sari-roti-receipt.jpg", { type: "image/jpeg" });
      shouldFailToLoad = true;

      const result = await scanReceipt(dummyFile);
      expect(result.merchant).toBe("Alfamart / St Tanah Abang");
      expect(result.amount).toBe(4500);
      expect(result.category).toBe("food");
      expect(result.items).toHaveLength(1);
    });

    it("returns Indomaret mock result as the default fallback", async () => {
      const dummyFile = new File(["dummy content"], "random_receipt.jpg", { type: "image/jpeg" });
      shouldFailToLoad = true;

      const result = await scanReceipt(dummyFile);
      expect(result.merchant).toBe("Indomaret");
      expect(result.amount).toBe(75400); // sum of Indomaret items
      expect(result.category).toBe("shopping");
      expect(result.items).toBeDefined();
    });
  });

  describe("scanReceipt success path (with mocked Tesseract)", () => {
    it("successfully parses OCR result when recognize succeeds", async () => {
      const dummyFile = new File(["dummy content"], "warteg.jpg", { type: "image/jpeg" });
      const result = await scanReceipt(dummyFile);
      
      expect(result.merchant).toBe("WARTEG MANDIRI");
      expect(result.amount).toBe(26000);
      expect(result.category).toBe("food"); // WARTEG maps to food
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("degrades to mock if OCR output has no valid amount", async () => {
      mockTextResult = "No amount here";

      const dummyFile = new File(["dummy content"], "empty.jpg", { type: "image/jpeg" });
      const result = await scanReceipt(dummyFile);
      // default fallback is Indomaret
      expect(result.merchant).toBe("Indomaret");
    });
  });

  describe("scanReceiptFromUrl", () => {
    it("fetches data URL and returns scan result", async () => {
      // Mock global fetch
      const mockBlob = new Blob(["dummy content"], { type: "image/jpeg" });
      const mockResponse = {
        blob: vi.fn().mockResolvedValue(mockBlob),
      };
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      try {
        const result = await scanReceiptFromUrl("data:image/jpeg;base64,dummy");
        expect(globalThis.fetch).toHaveBeenCalledWith("data:image/jpeg;base64,dummy");
        expect(result).toBeDefined();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
