"use client";

import { useSyncExternalStore } from "react";
import { dayKey, weekKey } from "./date";
import { finishWeek, type LeagueResult } from "./league";
import { rewardForBreak, type DayLog } from "./rules";
import { DEFAULT_TITLE, itemById, isOwned, type Outfit } from "./shop";

/** Everything GoReal remembers. It lives in the phone's browser storage, no account needed. */
export type GoRealState = {
  version: 1;
  onboarded: boolean;
  name: string;
  phoneLimit: number;
  breakGoal: number;
  blockedApps: string[];

  coins: number;
  xp: number;
  totalBreakMinutes: number;
  completedBreaks: number;
  quitBreaks: number;
  longestBreak: number;
  days: Record<string, DayLog>;

  owned: string[];
  outfit: Outfit | null;
  title: string;

  league: { weekKey: string; tier: number; lastResult: LeagueResult | null; bestTier: number };

  /** A break that is running right now. Saved so closing the app mid-break counts as quitting. */
  activeBreak: { startedAt: number; minutes: number } | null;
  /** Message to show once, e.g. after the app was closed during a break. */
  notice: "left-during-break" | null;
};

const STORAGE_KEY = "goreal:v1";

export function initialState(): GoRealState {
  return {
    version: 1,
    onboarded: false,
    name: "",
    phoneLimit: 60,
    breakGoal: 30,
    blockedApps: [],
    coins: 0,
    xp: 0,
    totalBreakMinutes: 0,
    completedBreaks: 0,
    quitBreaks: 0,
    longestBreak: 0,
    days: {},
    owned: [],
    outfit: null,
    title: DEFAULT_TITLE,
    league: { weekKey: weekKey(), tier: 0, lastResult: null, bestTier: 0 },
    activeBreak: null,
    notice: null,
  };
}

let state: GoRealState | null = null;
const listeners = new Set<() => void>();

/** Runs once when the app opens: settles a break that was left open and rolls the league week over. */
function settleOnOpen(s: GoRealState): GoRealState {
  let next = s;
  if (next.activeBreak) {
    next = { ...next, activeBreak: null, quitBreaks: next.quitBreaks + 1, notice: "left-during-break" };
  }
  const current = weekKey();
  if (next.league.weekKey !== current) {
    const result = finishWeek(next.days, next.league.weekKey, next.league.tier, next.name);
    next = {
      ...next,
      league: {
        weekKey: current,
        tier: result.toTier,
        lastResult: result,
        bestTier: Math.max(next.league.bestTier, result.toTier),
      },
    };
  }
  return next;
}

function load(): GoRealState {
  let loaded = initialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) loaded = { ...loaded, ...JSON.parse(raw) };
  } catch {
    // Broken or blocked storage: start fresh.
  }
  const settled = settleOnOpen(loaded);
  if (settled !== loaded) persist(settled);
  return settled;
}

function persist(s: GoRealState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Private mode or full storage: keep working in memory.
  }
}

function getSnapshot(): GoRealState {
  if (!state) state = load();
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      state = load();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Saved state, or `null` while the page is still loading on the server. */
export function useGoReal(): GoRealState | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

/** Latest state outside of React rendering (e.g. right after an action). */
export function getState(): GoRealState {
  return getSnapshot();
}

export function update(fn: (s: GoRealState) => GoRealState) {
  state = fn(getSnapshot());
  persist(state);
  listeners.forEach((l) => l());
}

/* ---------- actions ---------- */

export function completeOnboarding(input: { name: string; phoneLimit: number; blockedApps: string[] }) {
  update((s) => ({ ...s, ...input, onboarded: true, league: { ...s.league, weekKey: weekKey() } }));
}

export function startBreak(minutes: number) {
  update((s) => ({ ...s, activeBreak: { startedAt: Date.now(), minutes } }));
}

export function finishBreak() {
  const s = getSnapshot();
  if (!s.activeBreak) return { coins: 0, xp: 0 };
  const { minutes } = s.activeBreak;
  const reward = rewardForBreak(minutes, true);
  const key = dayKey();
  const day = s.days[key] ?? { breakMinutes: 0 };
  update((prev) => ({
    ...prev,
    activeBreak: null,
    coins: prev.coins + reward.coins,
    xp: prev.xp + reward.xp,
    totalBreakMinutes: prev.totalBreakMinutes + minutes,
    completedBreaks: prev.completedBreaks + 1,
    longestBreak: Math.max(prev.longestBreak, minutes),
    days: { ...prev.days, [key]: { ...day, breakMinutes: day.breakMinutes + minutes } },
  }));
  return reward;
}

export function quitBreak() {
  update((s) => (s.activeBreak ? { ...s, activeBreak: null, quitBreaks: s.quitBreaks + 1 } : s));
}

export function logPhoneTime(minutes: number) {
  const key = dayKey();
  update((s) => {
    const day = s.days[key] ?? { breakMinutes: 0 };
    return { ...s, days: { ...s.days, [key]: { ...day, phoneMinutes: minutes } } };
  });
}

export function clearNotice() {
  update((s) => ({ ...s, notice: null }));
}

export function markLeagueResultSeen() {
  update((s) =>
    s.league.lastResult ? { ...s, league: { ...s.league, lastResult: { ...s.league.lastResult, seen: true } } } : s,
  );
}

/** Buy an item (if affordable) and put it on. Returns false if not enough coins. */
export function buyOrEquip(itemId: string): boolean {
  const s = getSnapshot();
  const item = itemById(itemId);
  if (!item) return false;
  const owned = isOwned(item, s.owned, s.totalBreakMinutes);
  if (!owned && s.coins < item.price) return false;
  update((prev) => {
    const next = owned
      ? prev
      : { ...prev, coins: prev.coins - item.price, owned: [...prev.owned, item.id] };
    if (item.kind === "outfit") {
      return { ...next, outfit: prev.outfit === item.outfit && owned ? null : item.outfit };
    }
    return { ...next, title: item.id };
  });
  return true;
}

export function setGoals(goals: { phoneLimit?: number; breakGoal?: number }) {
  update((s) => ({ ...s, ...goals }));
}

export function resetEverything() {
  update(() => initialState());
}
