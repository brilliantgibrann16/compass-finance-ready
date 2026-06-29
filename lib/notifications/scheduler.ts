/**
 * Notification Scheduler — Capacitor Local Notifications Bridge
 *
 * Schedules local notifications for bill due dates, debt installments,
 * and savings goal reminders. Falls back gracefully on web where
 * Capacitor plugins are not available.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

import type { Debt, SavingsGoal } from "@/lib/types";

interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
}

/**
 * Attempts to schedule local notifications via Capacitor.
 * Falls back silently on web or if the plugin is not available.
 */
export async function scheduleDebtReminders(debts: Debt[]): Promise<void> {
  const notifications: ScheduledNotification[] = [];
  const now = new Date();

  for (const debt of debts) {
    for (const installment of debt.installments) {
      if (installment.isPaid) continue;

      const dueDate = new Date(installment.dueDate);
      // Schedule 1 day before due date
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - 1);

      if (reminderDate > now) {
        notifications.push({
          id: hashStringToId(`${debt.id}-${installment.dueDate}`),
          title: `💰 ${debt.name} — Jatuh Tempo Besok`,
          body: `Cicilan Rp${installment.amount.toLocaleString("id-ID")} jatuh tempo ${dueDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`,
          scheduleAt: reminderDate,
        });
      }
    }
  }

  await scheduleNative(notifications);
}

export async function scheduleSavingsReminders(goals: SavingsGoal[]): Promise<void> {
  const notifications: ScheduledNotification[] = [];
  const now = new Date();

  for (const goal of goals) {
    if (goal.currentAmount >= goal.targetAmount) continue;

    // Monthly reminder on the 1st
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0);
    notifications.push({
      id: hashStringToId(`goal-${goal.id}`),
      title: `🎯 ${goal.name}`,
      body: `Jangan lupa kontribusi bulanan! Target: Rp${goal.targetAmount.toLocaleString("id-ID")}`,
      scheduleAt: nextMonth,
    });
  }

  await scheduleNative(notifications);
}

async function scheduleNative(notifications: ScheduledNotification[]): Promise<void> {
  if (notifications.length === 0) return;

  try {
    // Dynamic import at runtime — avoids bundling Capacitor plugin for web.
    const mod: any = await import("@capacitor/local-notifications");
    const LocalNotifications = mod?.LocalNotifications;

    if (!LocalNotifications) return;

    // Request permission
    const permResult = await LocalNotifications.requestPermissions();
    if (permResult.display !== "granted") return;

    // Cancel existing scheduled notifications
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n: any) => ({ id: n.id })),
      });
    }

    // Schedule new notifications
    await LocalNotifications.schedule({
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        schedule: { at: n.scheduleAt },
        sound: undefined,
        smallIcon: "ic_stat_compass",
        iconColor: "#F0B429",
      })),
    });
  } catch {
    // Capacitor plugin not available (running in browser) — silent fallback
  }
}

/** Generate a stable numeric ID from a string */
function hashStringToId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
