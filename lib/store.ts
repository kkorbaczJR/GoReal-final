"use client";

import { useSyncExternalStore } from "react";
import { dayKey } from "./date";
import { MAX_FREEZES, WELCOME_GIFT, applyFreezes, changeGoals, rewardForBreak, stampGoals, type DayLog } from "./rules";
import { allowed, eventNotif } from "./notifications/triggers";
import {
  defaultNotifState,
  mergeNotifState,
  withDelivered,
  type Notif,
  type NotifCategory,
  type NotifPrefs,
  type NotifState,
} from "./notifications/types";
import { canMeasure } from "./phone";
import {
  DEFAULT_ACCENT,
  DEFAULT_TITLE,
  FREEZE_PRICE,
  itemById,
  isAccent,
  isOwned,
  type Accent,
  type Aura,
  type Back,
  type Background,
  type Buddy,
  type Face,
  type Neck,
  type Outfit,
} from "./shop";
import { withPhoneMinutes } from "./usage";

/**
 * Everything GoReal remembers. It lives in the phone's browser storage, no account needed. With an account
 * it is also saved there (see `lib/account.ts`).
 */
export type GoRealState = {
  version: 1;
  onboarded: boolean;
  name: string;
  phoneLimit: number;
  breakGoal: number;
  blockedApps: string[];
  /** The day onboarding ended. Measured phone time never counts for days before it. */
  startedOn: string | null;
  /** The Android app measures phone time (usage access is on), so it is not logged by hand. */
  phoneTracking: boolean;

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
  neck: Neck | null;
  back: Back | null;
  aura: Aura | null;
  buddy: Buddy | null;
  background: Background | null;
  title: string;
  /** The colour of buttons and highlights, orange unless another one was bought in the shop. */
  accent: Accent;

  /** Streak freezes in stock (0 to 2). One is spent automatically for each missed day. */
  freezes: number;
  /** Freezes used so far, for the badge. */
  freezesUsed: number;
  /** Shown once after the app opens: freezes were just spent to save a streak. */
  freezeNotice: { days: number; streak: number; left: number } | null;

  /** Notification settings, the inbox and what was already sent. */
  notif: NotifState;

  /** A break that is running right now. Saved so closing the app mid-break counts as quitting. */
  activeBreak: { startedAt: number; minutes: number } | null;
  /** Message to show once, e.g. after the app was closed during a break. */
  notice: "left-during-break" | null;
};

const STORAGE_KEY = "goreal:v1";
/**
 * While a break is on screen, its window writes the time here every second. Another GoReal window that opens
 * meanwhile (a second tab, the installed app next to the browser) sees it and leaves the break running
 * instead of counting it as left.
 */
const BREAK_SHOWN_KEY = "goreal:break-shown";
const BREAK_SHOWN_FRESH_MS = 4000;

export function initialState(): GoRealState {
  return {
    version: 1,
    onboarded: false,
    name: "",
    phoneLimit: 60,
    breakGoal: 30,
    blockedApps: [],
    startedOn: null,
    phoneTracking: false,
    coins: 0,
    totalBreakMinutes: 0,
    completedBreaks: 0,
    quitBreaks: 0,
    longestBreak: 0,
    days: {},
    owned: [],
    outfit: null,
    face: null,
    neck: null,
    back: null,
    aura: null,
    buddy: null,
    background: null,
    title: DEFAULT_TITLE,
    accent: DEFAULT_ACCENT,
    freezes: 0,
    freezesUsed: 0,
    freezeNotice: null,
    notif: defaultNotifState(),
    activeBreak: null,
    notice: null,
  };
}

let state: GoRealState | null = null;
const listeners = new Set<() => void>();
/**
 * In the Android app with phone time measured, yesterday may look missed until the first reading arrives
 * (GoReal was not opened that evening). No freeze is spent and no streak news shown until it does.
 */
let waitingForPhone = false;

/**
 * Day housekeeping: every day keeps the goals it started with, and freezes are spent for missed days.
 * Safe to run any time. Returns the same object when nothing changed.
 */
function settleDay(s: GoRealState, now = new Date()): GoRealState {
  if (!s.onboarded) return s;
  let next = s;

  const stamped = stampGoals(next.days, next, now);
  if (stamped !== next.days) next = { ...next, days: stamped };

  const frozen = waitingForPhone ? null : applyFreezes(next.days, next, next.freezes, now);
  if (frozen) {
    next = {
      ...next,
      days: frozen.days,
      freezes: frozen.freezes,
      freezesUsed: next.freezesUsed + frozen.used,
      freezeNotice: { days: frozen.used, streak: frozen.saved, left: frozen.freezes },
    };
    if (allowed(next.notif.prefs, "freezeUsed")) {
      const n = eventNotif(
        next,
        "freezeUsed",
        {
          streak: frozen.saved,
          daysWord: frozen.used === 1 ? "a day" : `${frozen.used} days`,
          leftText: frozen.freezes === 0 ? "That was your last one." : `You have ${frozen.freezes} left.`,
        },
        now,
      );
      next = { ...next, notif: withDelivered(next.notif, n, true) };
    }
  }
  return next;
}

/** Runs once when the app opens: a break that was left open counts as quitting. */
function settleOnOpen(s: GoRealState): GoRealState {
  let next = s;
  if (next.activeBreak && !breakShownElsewhere()) {
    next = { ...next, activeBreak: null, quitBreaks: next.quitBreaks + 1, notice: "left-during-break" };
  }
  return settleDay(next);
}

/** Older saves kept the shades as a hat and had league data. */
function migrate(raw: Record<string, unknown>): Partial<GoRealState> {
  const copy = { ...raw };
  delete copy.league;
  delete copy.xp;
  const next = copy as Partial<GoRealState>;
  next.notif = mergeNotifState(copy.notif);
  if (next.onboarded && !next.startedOn) next.startedOn = Object.keys(next.days ?? {}).sort()[0] ?? dayKey();
  if (typeof next.freezes === "number") next.freezes = Math.min(MAX_FREEZES, Math.max(0, Math.floor(next.freezes)));
  const ownedIds = Array.isArray(next.owned) ? next.owned : [];
  if (!isAccent(next.accent) || (next.accent !== DEFAULT_ACCENT && !ownedIds.includes(`color-${next.accent}`))) {
    delete next.accent;
  }
  if ((next.outfit as string) === "shades") return { ...next, outfit: null, face: "shades" };
  return next;
}

/** The saved state, or null when there is none or storage is broken or blocked. */
function readSaved(): GoRealState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...initialState(), ...migrate(JSON.parse(raw)) } : null;
  } catch {
    return null;
  }
}

/** When the app opens: a break left running means the app was closed during it. */
function load(): GoRealState {
  const loaded = readSaved() ?? initialState();
  if (state === null) waitingForPhone = loaded.phoneTracking && canMeasure();
  const settled = settleOnOpen(loaded);
  if (settled !== loaded) persist(settled);
  return settled;
}

/**
 * What another GoReal window just saved. Never counts as opening the app: that would end this window's own
 * break (and leave its break screen empty).
 */
function reloadFromOtherWindow(): GoRealState {
  return settleDay(readSaved() ?? initialState());
}

function breakShownElsewhere(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(BREAK_SHOWN_KEY) ?? 0) < BREAK_SHOWN_FRESH_MS;
  } catch {
    return false;
  }
}

/** The break screen calls this every second while it is visible. */
export function markBreakShown() {
  try {
    localStorage.setItem(BREAK_SHOWN_KEY, String(Date.now()));
  } catch {}
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
      state = reloadFromOtherWindow();
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

/** True until the first phone-time reading arrives (Android app with phone time measured only). */
export function useWaitingForPhone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      getSnapshot();
      return waitingForPhone;
    },
    () => false,
  );
}

/** Latest state outside of React rendering (e.g. right after an action). */
export function getState(): GoRealState {
  return getSnapshot();
}

let onLocalChange: (() => void) | null = null;

/** Called after every change made on this phone (not after `replaceState`), so it can be saved to the account. */
export function setLocalChangeHook(hook: (() => void) | null) {
  onLocalChange = hook;
}

export function update(fn: (s: GoRealState) => GoRealState) {
  const prev = getSnapshot();
  state = fn(prev);
  persist(state);
  listeners.forEach((l) => l());
  if (state !== prev) onLocalChange?.();
}

/** Wipe this phone. Does not tell the account (Start over logs out first when signed in). */
export function resetEverything() {
  const hook = onLocalChange;
  onLocalChange = null;
  update(() => initialState());
  onLocalChange = hook;
}

/** Progress downloaded from the account replaces what is on this phone. */
export function replaceState(saved: Record<string, unknown>) {
  const next = settleDay({ ...initialState(), ...migrate(saved) });
  state = next;
  persist(next);
  listeners.forEach((l) => l());
}

/* ---------- actions ---------- */

export function completeOnboarding(input: { name: string; phoneLimit: number; blockedApps: string[] }) {
  update((s) =>
    settleDay({
      ...s,
      ...input,
      coins: s.coins + (s.onboarded ? 0 : WELCOME_GIFT),
      startedOn: s.startedOn ?? dayKey(),
      onboarded: true,
    }),
  );
}

/** Call when the app comes back to the foreground: a new day may have started. */
export function refreshDay() {
  const current = getSnapshot();
  const next = settleDay(current);
  if (next !== current) update(() => next);
}

export function startBreak(minutes: number) {
  markBreakShown();
  update((s) => ({ ...s, activeBreak: { startedAt: Date.now(), minutes } }));
}

export function finishBreak() {
  const s = getSnapshot();
  if (!s.activeBreak) return { coins: 0 };
  const { minutes } = s.activeBreak;
  const reward = rewardForBreak(minutes, true);
  const key = dayKey();
  update((prev) => {
    if (!prev.activeBreak) return prev;
    return {
      ...prev,
      activeBreak: null,
      coins: prev.coins + reward.coins,
      totalBreakMinutes: prev.totalBreakMinutes + minutes,
      completedBreaks: prev.completedBreaks + 1,
      longestBreak: Math.max(prev.longestBreak, minutes),
      days: { ...prev.days, [key]: { ...dayFor(prev, key), breakMinutes: dayFor(prev, key).breakMinutes + minutes } },
    };
  });
  return reward;
}

export function quitBreak() {
  update((s) => (s.activeBreak ? { ...s, activeBreak: null, quitBreaks: s.quitBreaks + 1 } : s));
}

export function logPhoneTime(minutes: number) {
  const key = dayKey();
  update((s) => ({ ...s, days: { ...s.days, [key]: { ...dayFor(s, key), phoneMinutes: minutes } } }));
}

/** Fresh minutes per day from the Android app. Turns measuring on and lets the day settle. */
export function syncPhoneTime(totals: Record<string, number>) {
  const wasWaiting = waitingForPhone;
  waitingForPhone = false;
  const s = getSnapshot();
  const days = withPhoneMinutes(s.days, totals, s.startedOn ?? dayKey(), dayKey());
  const next = settleDay(days === s.days && s.phoneTracking ? s : { ...s, days, phoneTracking: true });
  if (next !== s || wasWaiting) update(() => next);
}

/** The Android app could not read phone time. If usage access was turned off, go back to logging by hand. */
export function phoneReadFailed(accessOff: boolean) {
  const s = getSnapshot();
  const turnOff = accessOff && s.phoneTracking;
  if (!waitingForPhone && !turnOff) return;
  waitingForPhone = false;
  update((prev) => settleDay(turnOff ? { ...prev, phoneTracking: false } : prev));
}

/** A day entry that always carries the goals it started with. */
function dayFor(s: GoRealState, key: string): DayLog {
  const day = s.days[key] ?? { breakMinutes: 0 };
  return day.goal ? day : { ...day, goal: { phoneLimit: s.phoneLimit, breakGoal: s.breakGoal } };
}

export function clearFreezeNotice() {
  update((s) => ({ ...s, freezeNotice: null }));
}

/** Buy one streak freeze. You can hold at most two. */
export function buyFreeze(): "ok" | "full" | "coins" {
  const s = getSnapshot();
  if (s.freezes >= MAX_FREEZES) return "full";
  if (s.coins < FREEZE_PRICE) return "coins";
  update((prev) => ({ ...prev, coins: prev.coins - FREEZE_PRICE, freezes: prev.freezes + 1 }));
  return "ok";
}

export function clearNotice() {
  update((s) => ({ ...s, notice: null }));
}

/** Buy an item (if affordable) and put it on. Returns false if not enough coins. */
export function buyOrEquip(itemId: string): boolean {
  const s = getSnapshot();
  const item = itemById(itemId);
  if (!item || item.kind === "freeze") return false;
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
      case "neck":
        return { ...next, neck: prev.neck === item.look && owned ? null : item.look };
      case "back":
        return { ...next, back: prev.back === item.look && owned ? null : item.look };
      case "aura":
        return { ...next, aura: prev.aura === item.look && owned ? null : item.look };
      case "buddy":
        return { ...next, buddy: prev.buddy === item.look && owned ? null : item.look };
      case "background":
        return { ...next, background: prev.background === item.look && owned ? null : item.look };
      case "title":
        return { ...next, title: item.id };
      case "color":
        return { ...next, accent: item.look };
    }
  });
  return true;
}

/** Past days keep their goals. Today follows the change when that cannot be gamed (see `changeGoals`). */
export function setGoals(goals: { phoneLimit?: number; breakGoal?: number }) {
  update((s) => ({ ...s, days: changeGoals(s.days, s, goals, new Date()), ...goals }));
}

/* ---------- notifications ---------- */

export type NotifPrefsPatch = Partial<Omit<NotifPrefs, "categories">> & {
  categories?: Partial<Record<NotifCategory, boolean>>;
};

export function setNotifPrefs(patch: NotifPrefsPatch) {
  update((s) => {
    const { prefs } = s.notif;
    return {
      ...s,
      notif: { ...s.notif, prefs: { ...prefs, ...patch, categories: { ...prefs.categories, ...patch.categories } } },
    };
  });
}

/** Records a delivered notification in the inbox. Returns false if it was already delivered. */
export function pushNotif(n: Notif, opts: { shown?: boolean } = {}): boolean {
  if (getSnapshot().notif.sent.includes(n.id)) return false;
  update((s) => ({ ...s, notif: withDelivered(s.notif, n, opts.shown ?? false) }));
  return true;
}

export function markInboxRead() {
  update((s) =>
    s.notif.inbox.some((i) => !i.read)
      ? { ...s, notif: { ...s.notif, inbox: s.notif.inbox.map((i) => (i.read ? i : { ...i, read: true })) } }
      : s,
  );
}

/** The pop-up banner for this one was shown (or skipped), so it is never shown again. */
export function markShown(id: string) {
  update((s) => ({
    ...s,
    notif: { ...s.notif, inbox: s.notif.inbox.map((i) => (i.id === id ? { ...i, shown: true } : i)) },
  }));
}

export function clearInbox() {
  update((s) => ({ ...s, notif: { ...s.notif, inbox: [] } }));
}
