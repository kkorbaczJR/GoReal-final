"use client";

import { useSyncExternalStore } from "react";
import { dayKey } from "./date";
import { rewardForBreak, type DayLog } from "./rules";
import { DEFAULT_TITLE, itemById, isOwned, type Background, type Face, type Outfit } from "./shop";

/** Everything GoReal remembers. It lives in the phone's browser storage, no account needed. */
export type GoRealState = {
  version: 1;
  onboarded: boolean;
  name: string;
  phoneLimit: number;
  breakGoal: number;
  blockedApps: string[];

  coins: number;
  totalBreakMinutes: number;
  completedBreaks: number;
  quitBreaks: number;
  longestBreak: number;
  days: Record<string, DayLog>;

  owned: string[];
  /** What Rilo wears on his head. */
  outfit: Outfit | null;
  face: Face | null;
  background: Background | null;
  title: string;

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
    totalBreakMinutes: 0,
    completedBreaks: 0,
    quitBreaks: 0,
    longestBreak: 0,
    days: {},
    owned: [],
    outfit: null,
    face: null,
    background: null,
    title: DEFAULT_TITLE,
    activeBreak: null,
    notice: null,
  };
}

let state: GoRealState | null = null;
const listeners = new Set<() => void>();

/** Runs once when the app opens: a break that was left open counts as quitting. */
function settleOnOpen(s: GoRealState): GoRealState {
  if (!s.activeBreak) return s;
  return { ...s, activeBreak: null, quitBreaks: s.quitBreaks + 1, notice: "left-during-break" };
}

/** Older saves kept the shades as a hat and had league data. */
function migrate(raw: Record<string, unknown>): Partial<GoRealState> {
  const copy = { ...raw };
  delete copy.league;
  delete copy.xp;
  const next = copy as Partial<GoRealState>;
  if ((next.outfit as string) === "shades") return { ...next, outfit: null, face: "shades" };
  return next;
}

function load(): GoRealState {
  let loaded = initialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) loaded = { ...loaded, ...migrate(JSON.parse(raw)) };
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
  update((s) => ({ ...s, ...input, onboarded: true }));
}

export function startBreak(minutes: number) {
  update((s) => ({ ...s, activeBreak: { startedAt: Date.now(), minutes } }));
}

export function finishBreak() {
  const s = getSnapshot();
  if (!s.activeBreak) return { coins: 0 };
  const { minutes } = s.activeBreak;
  const reward = rewardForBreak(minutes, true);
  const key = dayKey();
  const day = s.days[key] ?? { breakMinutes: 0 };
  update((prev) => ({
    ...prev,
    activeBreak: null,
    coins: prev.coins + reward.coins,
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
    switch (item.kind) {
      case "hat":
        return { ...next, outfit: prev.outfit === item.look && owned ? null : item.look };
      case "face":
        return { ...next, face: prev.face === item.look && owned ? null : item.look };
      case "background":
        return { ...next, background: prev.background === item.look && owned ? null : item.look };
      case "title":
        return { ...next, title: item.id };
    }
  });
  return true;
}

export function setGoals(goals: { phoneLimit?: number; breakGoal?: number }) {
  update((s) => ({ ...s, ...goals }));
}

export function resetEverything() {
  update(() => initialState());
}
