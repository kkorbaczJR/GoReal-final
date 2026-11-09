/**
 * Phone use, as GoReal sees it. Only the apps picked in onboarding count.
 * Pure functions: the Android app reads intervals of foreground use from the system (see lib/phone.ts),
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

/** Today's total and the current session from raw intervals, to the nearest minute. Intervals may overlap or be unsorted. */
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
    todayMinutes: Math.round(total / MINUTE),
    session: live && sessionStart !== null ? { startedAt: sessionStart, minutes: Math.round((sessionEnd - sessionStart) / MINUTE) } : null,
    foregroundApp: last && now - last.end < MINUTE ? last.app : null,
  };
}

/** Milliseconds between `from` and `to` when any of the intervals was on screen. Overlaps count once. */
function coveredMs(intervals: UsageInterval[], from: number, to: number): number {
  const parts = intervals
    .map((i) => [Math.max(i.start, from), Math.min(i.end, to)])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let total = 0;
  let until = from;
  for (const [a, b] of parts) {
    if (b > until) total += b - Math.max(a, until);
    until = Math.max(until, b);
  }
  return total;
}

/** Minutes in counted apps for every day from the day of `from` up to today. Keys are day keys. */
export function dailyMinutes(intervals: UsageInterval[], from: number, now: number): Record<string, number> {
  const out: Record<string, number> = {};
  const f = new Date(from);
  for (let day = new Date(f.getFullYear(), f.getMonth(), f.getDate()); day.getTime() <= now; ) {
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    out[dayKey(day)] = Math.round(coveredMs(intervals, day.getTime(), Math.min(next.getTime(), now)) / MINUTE);
    day = next;
  }
  return out;
}

/** Minutes per app between `from` and `to`, most used first. Apps under half a minute are left out. */
export function minutesByApp(intervals: UsageInterval[], from: number, to: number): { app: string; minutes: number }[] {
  const apps = [...new Set(intervals.map((i) => i.app))];
  return apps
    .map((app) => ({ app, minutes: Math.round(coveredMs(intervals.filter((i) => i.app === app), from, to) / MINUTE) }))
    .filter((a) => a.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}

/**
 * Writes measured phone time into the history, for days from `firstDay` on (the day you started, so days before
 * GoReal never count). Days with no entry yet are created. A finished day can only go up: Android forgets old
 * usage after a few days, and a forgotten day must not turn into "0 minutes, under the limit".
 * Returns the same object when nothing changed.
 */
export function withPhoneMinutes(
  days: Record<string, DayLog>,
  totals: Record<string, number>,
  firstDay: string,
  today: string,
): Record<string, DayLog> {
  let next = days;
  for (const [key, measured] of Object.entries(totals)) {
    if (key < firstDay || key > today) continue;
    const stored = days[key]?.phoneMinutes;
    const minutes = key === today || stored === undefined ? measured : Math.max(stored, measured);
    if (stored === minutes) continue;
    if (next === days) next = { ...days };
    next[key] = { ...(days[key] ?? { breakMinutes: 0 }), phoneMinutes: minutes };
  }
  return next;
}

/** What the web app knows: only the phone time logged by hand, and never a live session. */
export function manualUsage(days: Record<string, DayLog>, now: number): UsageSnapshot {
  return { todayMinutes: days[dayKey(new Date(now))]?.phoneMinutes ?? 0, session: null, foregroundApp: null };
}
