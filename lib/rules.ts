import { addDays, dayKey } from "./date";

export type Goals = {
  /** Daily phone-time limit picked in onboarding (minutes). */
  phoneLimit: number;
  /** Minutes of breaks per day that also keep the streak alive. */
  breakGoal: number;
};

/** What one day looks like in the saved history. */
export type DayLog = {
  /** Minutes of finished breaks on that day. */
  breakMinutes: number;
  /** Phone time the user reported for that day (from their phone's Screen Time). */
  phoneMinutes?: number;
  /** The goals that applied that day. Changing goals later never rewrites old days. */
  goal?: Goals;
  /** A streak freeze covered this day: the streak survives, but the day is not counted. */
  frozen?: boolean;
};

/** Coins every new user gets when onboarding ends, enough for a first color or an extra. */
export const WELCOME_GIFT = 100;

export const PHONE_LIMIT_OPTIONS = [30, 60, 120];
export const BREAK_GOAL_OPTIONS = [15, 30, 60];
export const BREAK_LENGTH_OPTIONS = [5, 10, 15, 25, 45, 60];

/** You can keep at most this many streak freezes at a time. */
export const MAX_FREEZES = 2;

/** Finishing a break pays 20% extra, so long and short breaks earn the same per minute. */
export const FINISH_BONUS_RATE = 0.2;

/** If the app is hidden for longer than this during a break, the break fails. */
export const LEAVE_GRACE_SECONDS = 10;

/** 1 finished minute = 1 coin, plus a 20% finish bonus. Quitting early earns nothing. */
export function rewardForBreak(minutes: number, finished: boolean) {
  if (!finished) return { coins: 0 };
  return { coins: minutes + Math.round(minutes * FINISH_BONUS_RATE) };
}

/** The goals that count for a day: the ones saved with it, or the current ones for old days. */
export function goalsFor(day: DayLog | undefined, fallback: Goals): Goals {
  return day?.goal ?? { phoneLimit: fallback.phoneLimit, breakGoal: fallback.breakGoal };
}

/**
 * A day counts for the streak if the break goal was reached OR phone time stayed under the limit.
 * Phone time only goes up during a day, so it is only trusted once the day is over (`final`).
 * The break goal counts the moment it is reached.
 */
export function dayQualifies(day: DayLog | undefined, fallback: Goals, final = true): boolean {
  if (!day) return false;
  const goals = goalsFor(day, fallback);
  if (day.breakMinutes >= goals.breakGoal) return true;
  return final && day.phoneMinutes !== undefined && day.phoneMinutes <= goals.phoneLimit;
}

/** How a day looks in the week rows: counted, covered by a freeze, or not counted. */
export type DayState = "done" | "frozen" | "open";

export function dayState(day: DayLog | undefined, goals: Goals, isToday: boolean): DayState {
  if (day?.frozen) return "frozen";
  return dayQualifies(day, goals, !isToday) ? "done" : "open";
}

function streakEndingAt(days: Record<string, DayLog>, goals: Goals, end: Date, todayKey: string): number {
  let count = 0;
  let cursor = end;
  for (;;) {
    const key = dayKey(cursor);
    const day = days[key];
    if (dayQualifies(day, goals, key !== todayKey)) count++;
    else if (!day?.frozen) break;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export type StreakStatus = {
  /** Current streak in days. */
  count: number;
  /** Today already counts (the break goal is reached). */
  todayDone: boolean;
  /** Phone time logged today is under the limit. It counts once the day ends. */
  todayOnTrack: boolean;
  /** A streak that ended because yesterday was missed (0 if none). */
  lostStreak: number;
};

export function streakStatus(days: Record<string, DayLog>, goals: Goals, now = new Date()): StreakStatus {
  const todayKey = dayKey(now);
  const today = days[todayKey];
  const todayDone = dayQualifies(today, goals, false);
  const todayOnTrack = !todayDone && dayQualifies(today, goals, true);
  const count = streakEndingAt(days, goals, todayDone ? now : addDays(now, -1), todayKey);

  let lostStreak = 0;
  if (!todayDone && count === 0) {
    lostStreak = streakEndingAt(days, goals, addDays(now, -2), todayKey);
  }
  return { count, todayDone, todayOnTrack, lostStreak };
}

export function longestStreak(days: Record<string, DayLog>, goals: Goals, now = new Date()): number {
  const todayKey = dayKey(now);
  const counts = (key: string) => dayQualifies(days[key], goals, key !== todayKey);
  const keys = Object.keys(days)
    .filter((k) => counts(k) || days[k].frozen)
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of keys) {
    let consecutive = false;
    if (prev) {
      const [y, m, d] = prev.split("-").map(Number);
      consecutive = dayKey(addDays(new Date(y, m - 1, d), 1)) === key;
    }
    if (!consecutive) run = 0;
    if (counts(key)) run++;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

export type FreezeResult = {
  days: Record<string, DayLog>;
  /** Freezes left after this. */
  freezes: number;
  /** How many days were frozen just now. */
  used: number;
  /** Length of the streak that was kept alive. */
  saved: number;
};

/**
 * Called when the app opens. If a real streak would break because days were missed, and there are
 * enough freezes to cover every missed day, they are spent and the days are marked frozen.
 * Covering only part of a gap would waste the freezes, so in that case nothing is spent.
 */
export function applyFreezes(
  days: Record<string, DayLog>,
  goals: Goals,
  freezes: number,
  now = new Date(),
): FreezeResult | null {
  if (freezes <= 0) return null;
  const todayKey = dayKey(now);
  const missed: string[] = [];
  let cursor = addDays(now, -1);
  while (missed.length <= freezes) {
    const key = dayKey(cursor);
    const day = days[key];
    if (dayQualifies(day, goals, true) || day?.frozen) break;
    missed.push(key);
    cursor = addDays(cursor, -1);
  }
  if (missed.length === 0 || missed.length > freezes) return null;

  const saved = streakEndingAt(days, goals, cursor, todayKey);
  if (saved === 0) return null;

  const next = { ...days };
  for (const key of missed) next[key] = { ...(next[key] ?? { breakMinutes: 0 }), frozen: true };
  return { days: next, freezes: freezes - missed.length, used: missed.length, saved };
}

/**
 * Changes the goals. Past days never change. Today follows the change when it is safe:
 * - today has no progress yet (no break minutes, no phone time logged), so nothing can be gamed, or
 * - the change is stricter (a higher break goal, a lower phone limit) and today does not count yet.
 * An easier goal after today already has progress, or any change after today counts, waits until tomorrow.
 * `current` are the goals before the change.
 */
export function changeGoals(
  days: Record<string, DayLog>,
  current: Goals,
  change: Partial<Goals>,
  now = new Date(),
): Record<string, DayLog> {
  const stamped = stampGoals(days, current, now);
  const key = dayKey(now);
  const today = stamped[key];
  const old = today.goal ?? current;

  const untouched = today.breakMinutes === 0 && today.phoneMinutes === undefined;
  const counted = dayQualifies(today, current, false);
  const mayChange = (stricter: boolean) => untouched || (stricter && !counted);

  const goal: Goals = { ...old };
  if (change.phoneLimit !== undefined && mayChange(change.phoneLimit < old.phoneLimit)) goal.phoneLimit = change.phoneLimit;
  if (change.breakGoal !== undefined && mayChange(change.breakGoal > old.breakGoal)) goal.breakGoal = change.breakGoal;

  if (goal.phoneLimit === old.phoneLimit && goal.breakGoal === old.breakGoal) return stamped;
  return { ...stamped, [key]: { ...today, goal } };
}

/** True when today still runs on older goals than the ones in settings (the new ones start tomorrow). */
export function goalsWaitForTomorrow(days: Record<string, DayLog>, settings: Goals, now = new Date()): boolean {
  const goal = goalsFor(days[dayKey(now)], settings);
  return goal.phoneLimit !== settings.phoneLimit || goal.breakGoal !== settings.breakGoal;
}

/** Saves the current goals on every day that has none yet, and makes sure today exists. */
export function stampGoals(days: Record<string, DayLog>, goals: Goals, now = new Date()): Record<string, DayLog> {
  const stamp: Goals = { phoneLimit: goals.phoneLimit, breakGoal: goals.breakGoal };
  let next = days;
  const todayKey = dayKey(now);
  const keys = days[todayKey] ? Object.keys(days) : [...Object.keys(days), todayKey];
  for (const key of keys) {
    const day = days[key];
    if (day?.goal) continue;
    if (next === days) next = { ...days };
    next[key] = { ...(day ?? { breakMinutes: 0 }), goal: stamp };
  }
  return next;
}
