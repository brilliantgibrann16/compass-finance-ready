"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import {
  BarChart3, Brain, FileText, CreditCard,
  Target, ShoppingBag, Bell, ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";

const MENU_ITEMS = [
  {
    href: "/analytics",
    label: "Analytics",
    description: "Charts, trends & category breakdown",
    icon: BarChart3,
    accent: "text-purple-400",
    accentBg: "bg-purple-400/10",
  },
  {
    href: "/advisor",
    label: "AI Advisor",
    description: "Personalized financial recommendations",
    icon: Brain,
    accent: "text-gold",
    accentBg: "bg-gold/10",
  },
  {
    href: "/reports",
    label: "Monthly Reports",
    description: "Detailed summaries & PDF export",
    icon: FileText,
    accent: "text-sky-400",
    accentBg: "bg-sky-400/10",
  },
  {
    href: "/debt",
    label: "Debt Tracker",
    description: "Installments & payment schedule",
    icon: CreditCard,
    accent: "text-coral",
    accentBg: "bg-coral/10",
  },
  {
    href: "/goals",
    label: "Savings Goals",
    description: "Track your financial targets",
    icon: Target,
    accent: "text-emerald",
    accentBg: "bg-emerald/10",
  },
  {
    href: "/wishlist",
    label: "Wishlist",
    description: "Items you're saving for",
    icon: ShoppingBag,
    accent: "text-amber-400",
    accentBg: "bg-amber-400/10",
  },
  {
    href: "/notifications",
    label: "Notifications",
    description: "Alerts & reminders",
    icon: Bell,
    accent: "text-blue-400",
    accentBg: "bg-blue-400/10",
  },
] as const;

export default function MorePage() {
  const unreadCount = useAppStore((s) => s.notifications.filter((n) => !n.isRead).length);

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <PageHeader title="More" subtitle="All features & tools" />

      <div className="space-y-2">
        {MENU_ITEMS.map((item, i) => {
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 rounded-xl border border-border-soft bg-bg-raised p-4 transition hover:border-gold/20 active:scale-[0.98]"
              >
                <div className={clsx(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  item.accentBg,
                )}>
                  <Icon size={20} className={item.accent} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-semibold text-ink">{item.label}</p>
                    {item.href === "/notifications" && unreadCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted">{item.description}</p>
                </div>

                <ChevronRight size={16} className="shrink-0 text-ink-faint" />
              </motion.div>
            </Link>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}
