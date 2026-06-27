"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

/**
 * The Zustand store's persisted state only exists in localStorage,
 * which isn't available during SSR. This hook reports `true` once
 * the client has rehydrated from localStorage, so pages can avoid
 * briefly flashing seed data before the real numbers load.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useAppStore.persist.hasHydrated());
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  return hydrated;
}
