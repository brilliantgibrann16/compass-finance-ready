"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { translations, RTL_LOCALES, type Locale, type TranslationKey } from "./translations";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "compass_locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "id";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in translations) return stored as Locale;
  // Auto-detect from browser
  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang && browserLang in translations) return browserLang as Locale;
  return "id";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("id");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    // Update document direction for RTL languages
    document.documentElement.dir = RTL_LOCALES.includes(newLocale) ? "rtl" : "ltr";
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const dict = translations[locale];
      return (dict as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key;
    },
    [locale],
  );

  const isRTL = RTL_LOCALES.includes(locale);

  // Set initial direction
  useEffect(() => {
    if (mounted) {
      document.documentElement.dir = isRTL ? "rtl" : "ltr";
    }
  }, [isRTL, mounted]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback for components outside the provider (e.g., during SSR)
    return {
      locale: "id" as Locale,
      setLocale: () => {},
      t: (key: TranslationKey) => (translations.id as Record<string, string>)[key] ?? key,
      isRTL: false,
    };
  }
  return ctx;
}

export function useLanguage() {
  return useTranslation();
}
