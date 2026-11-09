/**
 * Phone use, as GoReal sees it. Only the apps picked in onboarding count.
 * Pure functions: the Android tracker (UsageStatsManager) will hand over intervals of foreground use,
 * and the web app, which cannot see other apps, uses the phone time you log by hand.
 */
import { dayKey } from "./date";
import type { DayLog } from "./rules";

/** One stretch of time an app was on screen. */
export type UsageInterval = { app: string; start: number; end: number };

export type UsageSnapshot = {
  /** Minutes in counted apps today. */
  todayMinutes: number;
  /** The stretch of use going on right now, or null if the phone is not in use. */
  session: { startedAt: number; minutes: number } | null;
  /** The counted app on screen right now, if any. */
  foregroundApp: string | null;
};

/** Short pauses (checking the lock screen, switching apps) do not end a session. */
export const SESSION_GAP_MINUTES = 3;

const MINUTE = 60_000;

/** Today's total and the current session from raw intervals. Intervals may overlap or be unsorted. */
export function usageSnapshot(intervals: UsageInterval[], now: number, gapMinutes = SESSION_GAP_MINUTES): UsageSnapshot {
  const d = new Date(now);
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const sorted = intervals
    .map((i) => ({ ...i, start: Math.max(i.start, dayStart), end: Math.min(i.end, now) }))
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);

  let total = 0;
  let coveredUntil = dayStart;
  let sessionStart: number | null = null;
  let sessionEnd = 0;
  for (const i of sorted) {
    const from = Math.max(i.start, coveredUntil);
    if (i.end > from) total += i.end - from;
    coveredUntil = Math.max(coveredUntil, i.end);

    if (sessionStart === null || i.start - sessionEnd > gapMinutes * MINUTE) sessionStart = i.start;
    sessionEnd = Math.max(sessionEnd, i.end);
  }

  const live = sessionStart !== null && now - sessionEnd <= gapMinutes * MINUTE;
  const last = sorted[sorted.length - 1];
  return {
    todayMinutes: Math.floor(total / MINUTE),
    session: live && sessionStart !== null ? { startedAt: sessionStart, minutes: Math.floor((sessionEnd - sessionStart) / MINUTE) } : null,
    foregroundApp: last && now - last.end < MINUTE ? last.app : null,
  };
}

/** What the web app knows: only the phone time logged by hand, and never a live session. */
export function manualUsage(days: Record<string, DayLog>, now: number): UsageSnapshot {
  return { todayMinutes: days[dayKey(new Date(now))]?.phoneMinutes ?? 0, session: null, foregroundApp: null };
}
