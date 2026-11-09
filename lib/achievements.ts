import { longestStreak } from "./rules";
import type { GoRealState } from "./store";

export type Achievement = {
  id: string;
  name: string;
  hint: string;
  unlocked: boolean;
};

export function achievements(s: GoRealState): Achievement[] {
  const best = longestStreak(s.days, s);
  const list: Omit<Achievement, "unlocked">[] = [];
  const checks: boolean[] = [];
  const add = (id: string, name: string, hint: string, unlocked: boolean) => {
    list.push({ id, name, hint });
    checks.push(unlocked);
  };

  add("first", "First break", "Finish your first break", s.completedBreaks >= 1);
  add("ten", "Ten breaks", "Finish 10 breaks", s.completedBreaks >= 10);
  add("hour", "Full hour", "Finish a 60 min break", s.longestBreak >= 60);
  add("streak3", "On fire", "Reach a 3 day streak", best >= 3);
  add("streak7", "Week strong", "Reach a 7 day streak", best >= 7);
  add("streak14", "Two weeks", "Reach a 14 day streak", best >= 14);
  add("streak30", "Month strong", "Reach a 30 day streak", best >= 30);
  add("freeze", "Cool save", "Let a streak freeze save your streak", s.freezesUsed >= 1);
  add("min100", "100 minutes", "100 min off your phone", s.totalBreakMinutes >= 100);
  add("min500", "500 minutes", "500 min off your phone", s.totalBreakMinutes >= 500);
  add("shopper", "Fresh look", "Get something in the shop", s.owned.length >= 1);
  add("collector", "Collector", "Own 5 shop items", s.owned.length >= 5);

  return list.map((a, i) => ({ ...a, unlocked: checks[i] }));
}
