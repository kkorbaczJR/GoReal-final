import { addDays, dayKey } from "./date";
import { days, type Lang } from "./lang";
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
  /** The words under the big number, already in the right language. */
  streakWord: string;
  /** Captions under the three facts. Each caption is one or two short lines. */
  factLabels: [string[], string[], string[]];
};

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_PL = ["N", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

const short = (minutes: number, lang: Lang) =>
  minutes < 60
    ? lang === "pl"
      ? `${minutes} min`
      : `${minutes}m`
    : lang === "pl"
      ? `${minutes / 60} godz.`
      : `${minutes / 60}h`;

/** The sentence under the week row. `celebrate` is the moment a break just made today count. */
export function streakMessage(
  count: number,
  todayDone: boolean,
  todayOnTrack: boolean,
  celebrate: boolean,
  lang: Lang = "en",
): string {
  if (lang === "pl") {
    if (celebrate) {
      return count === 1
        ? "Dzień pierwszy. Każda seria tu się zaczyna."
        : "Dobra passa. Jutro też zrób przerwę, żeby ją utrzymać.";
    }
    if (todayDone) return "Dzisiaj już się liczy. Do jutra!";
    if (todayOnTrack) return "Jesteś poniżej limitu telefonu. Jeśli tak zostanie, dzień zaliczy się o północy.";
    if (count > 0) return "Dzisiaj jeszcze się nie liczy. Jedna przerwa utrzyma serię.";
    return "Ukończ cel przerw albo zostań poniżej limitu telefonu, żeby zacząć serię.";
  }
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

export function shareDetails(s: Source, celebrate = false, now = new Date(), lang: Lang = "en"): ShareDetails {
  const { count, todayDone, todayOnTrack } = streakStatus(s.days, s, now);
  const goals = goalsFor(s.days[dayKey(now)], s);
  const best = longestStreak(s.days, s, now);
  const names = lang === "pl" ? WEEKDAY_PL : WEEKDAY;
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(now, i - 6);
    const today = i === 6;
    return {
      label: names[date.getDay()] ?? "",
      mark: dayState(s.days[dayKey(date)], s, today),
      today,
    };
  });
  return {
    count,
    line: streakMessage(count, todayDone, todayOnTrack, celebrate, lang),
    week,
    bestLabel: days(lang, best),
    limitLabel: `${short(goals.breakGoal, lang)} / ${short(goals.phoneLimit, lang)}`,
    freezeLabel: lang === "pl" ? `${s.freezes} z ${MAX_FREEZES}` : `${s.freezes} of ${MAX_FREEZES}`,
    streakWord:
      lang === "pl"
        ? count === 1
          ? "dzień z rzędu!"
          : count === 0
            ? "dni z rzędu"
            : "dni z rzędu!"
        : count === 0
          ? "day streak"
          : "day streak!",
    factLabels:
      lang === "pl"
        ? [["Najlepsza", "seria"], ["Przerwy albo", "limit telefonu"], ["Zamrożenia", "serii"]]
        : [["Best streak"], ["Breaks or phone", "limit"], ["Streak freezes"]],
  };
}
