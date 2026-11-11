import { addDays, dayKey } from "./date";
import { MAX_FREEZES, dayState, goalsFor, longestStreak, streakStatus, type DayLog, type Goals } from "./rules";

/** One cell in the week row on the streak screen. */
export type ShareDay = {
  label: string;
  mark: "done" | "frozen" | "open";
  today: boolean;
};

/**
 * The streak screen, as data. The share image draws this so the card and the modal say the same thing.
 */
export type ShareDetails = {
  count: number;
  line: string;
  week: ShareDay[];
  bestLabel: string;
  limitLabel: string;
  freezeLabel: string;
};

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

const short = (minutes: number) => (minutes < 60 ? `${minutes}m` : `${minutes / 60}h`);

/** The sentence under the week row. `celebrate` is the moment a break just made today count. */
export function streakMessage(count: number, todayDone: boolean, todayOnTrack: boolean, celebrate: boolean): string {
  if (celebrate) {
    return count === 1
      ? "Day one. Every streak starts here."
      : "You're on a roll. Take a break tomorrow to keep it going.";
  }
  if (todayDone) return "Today already counts. See you tomorrow!";
  if (todayOnTrack) return "You are under your phone limit. If it stays that way, today counts at midnight.";
  if (count > 0) return "Today doesn't count yet. One break keeps your streak alive.";
  return "Finish your break goal or stay under your phone limit to start a streak.";
}

type Source = Goals & { days: Record<string, DayLog>; freezes: number };

export function shareDetails(s: Source, celebrate = false, now = new Date()): ShareDetails {
  const { count, todayDone, todayOnTrack } = streakStatus(s.days, s, now);
  const goals = goalsFor(s.days[dayKey(now)], s);
  const best = longestStreak(s.days, s, now);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(now, i - 6);
    const today = i === 6;
    return {
      label: WEEKDAY[date.getDay()] ?? "",
      mark: dayState(s.days[dayKey(date)], s, today),
      today,
    };
  });
  return {
    count,
    line: streakMessage(count, todayDone, todayOnTrack, celebrate),
    week,
    bestLabel: `${best} ${best === 1 ? "day" : "days"}`,
    limitLabel: `${short(goals.breakGoal)} / ${short(goals.phoneLimit)}`,
    freezeLabel: `${s.freezes} of ${MAX_FREEZES}`,
  };
}
