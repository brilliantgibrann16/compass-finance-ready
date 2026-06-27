"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { PageHeader } from "@/components/ui/PageHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { Card } from "@/components/ui/Card";
import { generateNotifications } from "@/lib/engine/notificationEngine";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, CheckCircle, Info, Clock,
  Trash2, BellOff, ExternalLink,
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import type { NotificationType } from "@/lib/types";

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
  reminder: Clock,
};

const TYPE_STYLES: Record<NotificationType, { icon: string; bg: string; border: string }> = {
  warning: { icon: "text-coral", bg: "bg-coral/5", border: "border-coral/20" },
  success: { icon: "text-emerald", bg: "bg-emerald/5", border: "border-emerald/20" },
  info: { icon: "text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/20" },
  reminder: { icon: "text-gold", bg: "bg-gold/5", border: "border-gold/20" },
};

export default function NotificationsPage() {
  const hydrated = useHydrated();
  const notifications = useAppStore((s) => s.notifications);
  const addNotification = useAppStore((s) => s.addNotification);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const dismissNotification = useAppStore((s) => s.dismissNotification);
  const clearNotifications = useAppStore((s) => s.clearNotifications);

  // Generate fresh notifications on page load
  useEffect(() => {
    if (!hydrated) return;
    const state = useAppStore.getState();
    const fresh = generateNotifications({
      balance: state.balance,
      transactions: state.transactions,
      transferSettings: state.transferSettings,
      debts: state.debts,
      savingsGoals: state.savingsGoals,
      wishlist: state.wishlist,
      notifications: state.notifications,
    });

    // Only add notifications that don't already exist (by title match today)
    const todayStr = new Date().toISOString().slice(0, 10);
    const existingTitles = new Set(
      state.notifications
        .filter((n) => n.date === todayStr)
        .map((n) => n.title)
    );

    for (const n of fresh) {
      if (!existingTitles.has(n.title)) {
        addNotification(n);
      }
    }
  }, [hydrated, addNotification]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold" />
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <PageHeader title="Notifications" subtitle={`${unread.length} unread`} />

      {notifications.length > 0 && (
        <button
          onClick={clearNotifications}
          className="mb-4 flex items-center gap-2 text-sm text-ink-faint transition hover:text-coral"
        >
          <Trash2 size={14} />
          Clear all
        </button>
      )}

      {notifications.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-hover">
              <BellOff size={24} className="text-ink-faint" />
            </div>
            <p className="font-display font-medium text-ink">All caught up</p>
            <p className="text-sm text-ink-muted">No notifications right now. Check back later!</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">New</h3>
              <AnimatePresence>
                <div className="space-y-2">
                  {unread.map((notif, idx) => {
                    const style = TYPE_STYLES[notif.type];
                    const Icon = TYPE_ICONS[notif.type];
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ delay: idx * 0.04 }}
                        onClick={() => markNotificationRead(notif.id)}
                        className={clsx(
                          "group flex items-start gap-3 rounded-xl2 border p-4 cursor-pointer transition",
                          style.bg, style.border
                        )}
                      >
                        <Icon size={18} className={clsx("mt-0.5 shrink-0", style.icon)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink">{notif.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{notif.message}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {notif.href && (
                            <Link
                              href={notif.href}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-full p-1.5 text-ink-faint transition hover:bg-bg-hover hover:text-gold"
                            >
                              <ExternalLink size={14} />
                            </Link>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                            className="rounded-full p-1.5 text-ink-faint opacity-0 transition group-hover:opacity-100 hover:bg-bg-hover hover:text-coral"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </div>
          )}

          {read.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">Earlier</h3>
              <div className="space-y-2">
                {read.map((notif) => {
                  const Icon = TYPE_ICONS[notif.type];
                  return (
                    <div
                      key={notif.id}
                      className="group flex items-start gap-3 rounded-xl2 border border-border-soft bg-bg-raised/50 p-4"
                    >
                      <Icon size={18} className="mt-0.5 shrink-0 text-ink-faint" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-muted">{notif.title}</p>
                        <p className="mt-0.5 text-sm text-ink-faint">{notif.message}</p>
                      </div>
                      <button
                        onClick={() => dismissNotification(notif.id)}
                        className="shrink-0 rounded-full p-1.5 text-ink-faint opacity-0 transition group-hover:opacity-100 hover:bg-bg-hover hover:text-coral"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
