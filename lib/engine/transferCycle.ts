import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  getDate,
  setDate,
  startOfDay,
} from "date-fns";
import type { TransferSettings } from "@/lib/types";

export interface CycleInfo {
  cycleStart: Date;
  /** The date the *next* transfer lands. Also treated as the cycle's
   *  display boundary (e.g. "1 - 15 Jul"), even though spending only
   *  happens on the days strictly before it. */
  nextTransferDate: Date;
  daysUntilNextTransfer: number;
  daysElapsedInCycle: number;
  totalDaysInCycle: number;
  cycleLabel: string;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Computes the current twice-a-month transfer cycle for `today`.
 *
 * Two cycles per month:
 *   - [dayOne, dayTwo)   e.g. 1 - 15
 *   - [dayTwo, dayOne+1) e.g. 15 - end of month / 1st next month
 */
export function getCurrentCycle(today: Date, settings: TransferSettings): CycleInfo {
  const day = getDate(today);
  const { dayOne, dayTwo } = settings;

  let cycleStart: Date;
  let nextTransferDate: Date;

  if (day >= dayOne && day < dayTwo) {
    cycleStart = setDate(today, dayOne);
    nextTransferDate = setDate(today, dayTwo);
  } else if (day >= dayTwo) {
    cycleStart = setDate(today, dayTwo);
    nextTransferDate = setDate(addMonths(today, 1), dayOne);
  } else {
    // day < dayOne (e.g. dayOne isn't 1, and we're before it this month)
    const prevMonthEnd = endOfMonth(addMonths(today, -1));
    const clampedDayTwo = Math.min(dayTwo, getDate(prevMonthEnd));
    cycleStart = setDate(addMonths(today, -1), clampedDayTwo);
    nextTransferDate = setDate(today, dayOne);
  }

  const start = startOfDay(cycleStart);
  const next = startOfDay(nextTransferDate);
  const now = startOfDay(today);

  const totalDaysInCycle = Math.max(1, differenceInCalendarDays(next, start));
  const daysElapsedInCycle = Math.max(0, differenceInCalendarDays(now, start));
  const daysUntilNextTransfer = Math.max(0, differenceInCalendarDays(next, now));

  const cycleLabel = `${getDate(start)} – ${getDate(next)} ${MONTH_LABELS[start.getMonth()]}`;

  return {
    cycleStart: start,
    nextTransferDate: next,
    daysUntilNextTransfer,
    daysElapsedInCycle,
    totalDaysInCycle,
    cycleLabel,
  };
}
