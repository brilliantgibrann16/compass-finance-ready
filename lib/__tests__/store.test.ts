import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppStore } from "../store";

describe("safeFallbackStorage", () => {
  let store: any;

  beforeEach(() => {
    // Clear localStorage mock
    window.localStorage.clear();
    // Re-initialize store if needed, or simply test the persistence behavior.
    // Because Zustand's persist wraps it natively, we can simulate window missing.
  });

  it("gracefully switches to localized mocks when window is undefined", () => {
    // Save original window
    const originalWindow = global.window;
    
    // Simulate SSR or unprovisioned window
    // @ts-expect-error - overriding global window
    delete global.window;
    
    expect(() => {
      // Direct call should not throw
      const val = useAppStore.getState().balance;
      useAppStore.getState().setBalance(val + 100);
    }).not.toThrow();

    // Restore window
    global.window = originalWindow;
  });

  it("swallows errors when localStorage throws reference errors", () => {
    // Override localStorage to throw error
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(() => { throw new Error("Access Denied"); }),
        setItem: vi.fn(() => { throw new Error("Access Denied"); }),
        removeItem: vi.fn(() => { throw new Error("Access Denied"); }),
      },
      writable: true,
    });

    expect(() => {
      useAppStore.getState().setBalance(999);
    }).not.toThrow();

    // Restore localStorage
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    });
  });
});
