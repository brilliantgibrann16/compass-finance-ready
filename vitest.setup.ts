import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// 1. Auto-cleanup RTL setelah tiap test
afterEach(() => {
  cleanup();
});

// 2. Reset mock state antar test
beforeEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// 3. Polyfill: structuredClone
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value));
}

// 4. Polyfill: ResizeObserver (dibutuhkan UI library)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = ResizeObserverMock;
}

// 5. Polyfill: window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// 6. Polyfill: IntersectionObserver
class IntersectionObserverMock {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
if (typeof globalThis.IntersectionObserver === "undefined") {
    globalThis.IntersectionObserver = IntersectionObserverMock;
}

// 7. Polyfill: scrollTo
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: vi.fn(),
});

// 8. Suppress expected React "act" warnings false-positive
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (
    first.includes("Warning: An update to") &&
    first.includes("inside a test was not wrapped in act")
  ) {
    return;
  }
  originalConsoleError(...args);
};

// 9. Simulasi navigator.onLine default true
Object.defineProperty(navigator, "onLine", {
  writable: true,
  configurable: true,
  value: true,
});