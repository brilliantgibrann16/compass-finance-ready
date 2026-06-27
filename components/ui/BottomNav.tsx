"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, ScanLine, BarChart3, Brain, MoreHorizontal } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

import { clsx } from "clsx";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { href: "/", label: t("navHome"), icon: Home },
    { href: "/scan/", label: t("navScan"), icon: ScanLine },
    { href: "/insights/", label: t("navInsights"), icon: BarChart3 },
    { href: "/coach/", label: t("navCoach"), icon: Brain },
    { href: "/more/", label: t("navMore"), icon: MoreHorizontal },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md aero-nav pb-[max(0.25rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around px-2 pt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition",
                isActive ? "text-gold" : "text-ink-faint hover:text-ink-muted"
              )}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              <span>{item.label}</span>
              {isActive && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 h-0.5 w-8 rounded-full bg-gold"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
