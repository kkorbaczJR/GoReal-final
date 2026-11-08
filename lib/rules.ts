import { addDays, dayKey } from "./date";

/** What one day looks like in the saved history. */
export type DayLog = {
  /** Minutes of finished breaks on that day. */
  breakMinutes: number;
  /** Phone time the user reported for that day (from their phone's Screen Time). */
  phoneMinutes?: number;
};

export type Goals = {
  /** Daily phone-time limit picked in onboarding (minutes). */
  phoneLimit: number;
  /** Minutes of breaks per day that also keep the streak alive. */
  breakGoal: number;
};

export const PHONE_LIMIT_OPTIONS = [30, 60, 120];
export const BREAK_GOAL_OPTIONS = [15, 30, 60];
export const BREAK_LENGTH_OPTIONS = [5, 10, 15, 25, 45, 60];

/** Extra coins for sticking with a break until the end. */
export const FINISH_BONUS = 5;

/** If the app is hidden for longer than this during a break, the break fails. */
export const LEAVE_GRACE_SECONDS = 10;

/** 1 finished minute = 1 XP and 1 coin, plus a bonus for finishing. Quitting early earns nothing. */
export function rewardForBreak(minutes: number, finished: boolean) {
  if (!finished) return { coins: 0, xp: 0 };
  return { coins: minutes + FINISH_BONUS, xp: minutes };
}

/** A day counts for the streak if the user hit the break goal OR stayed under the phone limit. */
export function dayQualifies(day: DayLog | undefined, goals: Goals): boolean {
  if (!day) return false;
  if (day.breakMinutes >= goals.breakGoal) return true;
  return day.phoneMinutes !== undefined && day.phoneMinutes <= goals.phoneLimit;
}

function streakEndingAt(days: Record<string, DayLog>, goals: Goals, end: Date): number {
  let count = 0;
  let cursor = end;
  while (dayQualifies(days[dayKey(cursor)], goals)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export type StreakStatus = {
  /** Current streak in days. */
  count: number;
  /** Today already counts. */
  todayDone: boolean;
  /** A streak that ended because yesterday was missed (0 if none). */
  lostStreak: number;
};

export function streakStatus(days: Record<string, DayLog>, goals: Goals, now = new Date()): StreakStatus {
  const todayDone = dayQualifies(days[dayKey(now)], goals);
  const yesterday = addDays(now, -1);
  const count = todayDone ? streakEndingAt(days, goals, now) : streakEndingAt(days, goals, yesterday);

  let lostStreak = 0;
  if (!todayDone && count === 0) {
    lostStreak = streakEndingAt(days, goals, addDays(now, -2));
  }
  return { count, todayDone, lostStreak };
}

export function longestStreak(days: Record<string, DayLog>, goals: Goals): number {
  const keys = Object.keys(days).filter((k) => dayQualifies(days[k], goals)).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of keys) {
    if (prev) {
      const [y, m, d] = prev.split("-").map(Number);
      const expected = dayKey(addDays(new Date(y, m - 1, d), 1));
      run = expected === key ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}
