"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

/**
 * Providers — Client-side context providers wrapper.
 *
 * Centralizes all React context providers so layout.tsx stays a
 * server component for metadata export compatibility.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </ThemeProvider>
  );
}
