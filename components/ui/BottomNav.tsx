"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, ScanLine, BarChart3, Brain, Bell } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/coach", label: "Coach", icon: Brain },
  { href: "/notifications", label: "Alerts", icon: Bell },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const unreadCount = useAppStore((s) => s.notifications.filter((n) => !n.isRead).length);

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
                {item.href === "/notifications" && unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1.5 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[9px] font-bold text-white"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
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
