import { WEEK_MS, addDays, dayKey, parseDayKey, weekStart } from "./date";
import type { DayLog } from "./rules";

export const TIERS = [
  { name: "Pebble" },
  { name: "Leaf" },
  { name: "Flame" },
  { name: "Moon" },
  { name: "Star" },
] as const;

export const LEAGUE_SIZE = 20;
export const MOVE_COUNT = 5;

/** Typical weekly XP (break minutes) of a bot in each tier. */
const TIER_BASE_XP = [70, 120, 180, 250, 330];

const BOT_NAMES = [
  "maja.k", "leo_skates", "zoe", "kuba2010", "nina.draws", "oskar", "lily_reads",
  "tymek", "ava.runs", "felix", "hana", "mateo_fc", "iga", "noah.b", "julka",
  "sam_outside", "emi", "kai", "ola.plays", "theo", "mila", "bruno", "wiki",
  "luca", "rosie", "adam.k", "sara_m", "finn", "zuzia", "max.climbs",
];

export type Player = {
  id: string;
  name: string;
  xp: number;
  isYou: boolean;
};

export type LeagueResult = {
  weekKey: string;
  rank: number;
  fromTier: number;
  toTier: number;
  seen: boolean;
};

/** Small seeded random generator so the same week always has the same bots. */
function seededRandom(seedText: string) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sum of the user's finished break minutes (= XP) during the week starting at `week`. */
export function weekXp(days: Record<string, DayLog>, week: string): number {
  const start = parseDayKey(week);
  let total = 0;
  for (let i = 0; i < 7; i++) {
    total += days[dayKey(addDays(start, i))]?.breakMinutes ?? 0;
  }
  return total;
}

/**
 * The 19 bots of a week. Each bot has a weekly target and a pace; its XP grows
 * through the week so the table feels alive. `progress` is 0..1 of the week.
 */
export function botsForWeek(week: string, tier: number, progress: number): Player[] {
  const rand = seededRandom(`${week}:${tier}`);
  const names = [...BOT_NAMES].sort(() => rand() - 0.5).slice(0, LEAGUE_SIZE - 1);
  const base = TIER_BASE_XP[tier];
  return names.map((name, i) => {
    const target = base * (0.15 + rand() * 1.6);
    const pace = 0.6 + rand() * 0.9;
    const wobble = 0.9 + rand() * 0.2;
    const f = Math.min(1, Math.pow(Math.max(0, progress), pace) * wobble);
    return { id: `bot-${i}`, name, xp: Math.round(target * f), isYou: false };
  });
}

export function weekProgress(now = new Date()): number {
  return Math.min(1, (now.getTime() - weekStart(now).getTime()) / WEEK_MS);
}

/** Full sorted table for a week, you included. */
export function standings(
  week: string,
  tier: number,
  you: { name: string; xp: number },
  progress: number,
): Player[] {
  const players = [...botsForWeek(week, tier, progress), { id: "you", name: you.name, xp: you.xp, isYou: true }];
  // On a tie you rank above bots: effort should feel rewarded.
  return players.sort((a, b) => b.xp - a.xp || Number(b.isYou) - Number(a.isYou));
}

export type Zone = "up" | "stay" | "down";

export function zoneForRank(rank: number, tier: number): Zone {
  if (rank <= MOVE_COUNT && tier < TIERS.length - 1) return "up";
  if (rank > LEAGUE_SIZE - MOVE_COUNT && tier > 0) return "down";
  return "stay";
}

/** Final result of a finished week: rank and the tier for next week. */
export function finishWeek(days: Record<string, DayLog>, week: string, tier: number, name: string): LeagueResult {
  const table = standings(week, tier, { name, xp: weekXp(days, week) }, 1);
  const rank = table.findIndex((p) => p.isYou) + 1;
  const zone = zoneForRank(rank, tier);
  const toTier = zone === "up" ? tier + 1 : zone === "down" ? tier - 1 : tier;
  return { weekKey: week, rank, fromTier: tier, toTier, seen: false };
}

export function msUntilWeekEnds(now = new Date()): number {
  return weekStart(now).getTime() + WEEK_MS - now.getTime();
}
