"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { AuthProvider } from "@/lib/auth/AuthContext";

/**
 * Providers — Client-side context providers wrapper.
 *
 * Centralizes all React context providers so layout.tsx stays a
 * server component for metadata export compatibility.
 *
 * AuthProvider must wrap everything that reads `useAuthContext()` —
 * including AppShell, which uses it to gate dashboard / More from
 * unauthenticated or unverified users.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>{children}</AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
