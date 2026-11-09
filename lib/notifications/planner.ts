/**
 * Decides which notifications GoReal wants to send and when. Pure functions: no DOM, no storage, no clock.
 * This file only depends on `lib/rules`, `lib/shop`, `lib/date` and the copy, so the same code can run in
 * the Expo phone app later. Only `import type` is used for the store.
 */
import { addDays, dayKey, parseDayKey } from "../date";
import { goalsFor, longestStreak, rewardForBreak, streakStatus } from "../rules";
import { FREEZE_PRICE, SHOP_ITEMS, isOwned } from "../shop";
import type { GoRealState } from "../store";
import { COMEBACK_STEPS, MILESTONES, writeCopy, type CopyCtx } from "./copy";
import {
  DAILY_CAP,
  KINDS,
  MIN_GAP_MINUTES,
  type Notif,
  type NotifAction,
  type NotifKind,
  type NotifPrefs,
  type QuietHours,
} from "./types";

const MINUTE = 60_000;
const DAY_MS = 24 * 60 * MINUTE;

/** A tip (shop or freeze) is sent at most once in this many days. */
export const TIP_SPACING_DAYS = 4;
/** Streak risk needs a streak of at least this to bother you. Last call needs 2. */
export const LAST_CALL_MIN_STREAK = 2;
export const FREEZE_TIP_MIN_STREAK = 5;

/** Clock times (hour, minute) of the scheduled kinds other than the daily reminder. */
const TIMES = {
  streakRisk: [20, 0],
  lastCall: [21, 45],
  tip: [18, 30],
} as const;

/** Quiet hours drop these instead of delaying them: a late "streak at risk" is useless. */
const SHIFTABLE: Record<NotifKind, boolean> = {
  nudge: true,
  comeback: true,
  freezeTip: true,
  shopTip: true,
  streakRisk: false,
  lastCall: false,
  breakEnd: false,
  freezeUsed: false,
  streakLost: false,
  milestone: false,
  limit80: false,
  limit100: false,
  blockedApp: false,
};

const ACTIONS: Record<NotifKind, NotifAction> = {
  nudge: "home",
  comeback: "home",
  streakRisk: "home",
  lastCall: "home",
  breakEnd: "home",
  shopTip: "shop",
  freezeTip: "shop",
  freezeUsed: "streak",
  streakLost: "streak",
  milestone: "streak",
  limit80: "home",
  limit100: "home",
  blockedApp: "home",
};

export function actionFor(kind: NotifKind): NotifAction {
  return ACTIONS[kind];
}

/* ---------- small helpers ---------- */

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** A whole number that goes up by one every local day. Used to rotate copy variants. */
export function dayNumber(date: Date): number {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

function daysBetween(fromKey: string, to: Date): number {
  return dayNumber(to) - dayNumber(parseDayKey(fromKey));
}

function atTime(day: Date, hour: number, minute = 0): number {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute).getTime();
}

/** Is this moment inside quiet hours? Handles ranges that cross midnight, like 22 to 8. */
export function isQuiet(quiet: QuietHours | null, ms: number): boolean {
  if (!quiet || quiet.start === quiet.end) return false;
  const h = new Date(ms).getHours();
  return quiet.start > quiet.end ? h >= quiet.start || h < quiet.end : h >= quiet.start && h < quiet.end;
}

/** The first moment at or after `ms` that is outside quiet hours. */
export function quietEnd(quiet: QuietHours | null, ms: number): number {
  if (!isQuiet(quiet, ms) || !quiet) return ms;
  const d = new Date(ms);
  let end = atTime(d, quiet.end);
  if (end <= ms) end = atTime(addDays(d, 1), quiet.end);
  return end;
}

/** Can this kind be delivered right now, as far as the user's settings go? */
export function allowed(prefs: NotifPrefs, kind: NotifKind): boolean {
  return prefs.enabled && prefs.categories[KINDS[kind].category];
}

/* ---------- context ---------- */

/** Everything the copy needs, for the day of `now`. Pass `extra` to add or override fields. */
export function buildCtx(state: GoRealState, now: Date, extra: Partial<CopyCtx> = {}): CopyCtx {
  const today = state.days[dayKey(now)];
  const goal = goalsFor(today, state).breakGoal;
  const minutes = today?.breakMinutes ?? 0;
  return {
    name: state.name,
    streak: streakStatus(state.days, state, now).count,
    goal,
    minutes,
    remaining: Math.max(0, goal - minutes),
    freezes: state.freezes,
    coins: state.coins,
    ...extra,
  };
}

function make(kind: NotifKind, id: string, at: number, ctx: CopyCtx, now: Date): Notif {
  const { title, body } = writeCopy(kind, ctx, dayNumber(now));
  return { id, kind, title, body, at, action: ACTIONS[kind] };
}

/**
 * Builds one notification for something that just happened (or, in the phone app, that was just detected).
 * The id is `kind:key`; the same key is never delivered twice. The key is the day unless you pass one.
 */
export function eventNotif(
  state: GoRealState,
  kind: NotifKind,
  extra: Partial<CopyCtx> = {},
  now: Date = new Date(),
  key: string = dayKey(now),
): Notif {
  return make(kind, `${kind}:${key}`, now.getTime(), buildCtx(state, now, extra), now);
}

/* ---------- history lookups ---------- */

/** The last day that had at least one finished break. Before any break, the first day we know about. */
function lastActiveKey(days: GoRealState["days"], todayKey: string): string {
  const keys = Object.keys(days).sort();
  for (let i = keys.length - 1; i >= 0; i--) if ((days[keys[i]]?.breakMinutes ?? 0) > 0) return keys[i];
  return keys[0] ?? todayKey;
}

function keyOfId(id: string): string | null {
  const key = id.slice(id.indexOf(":") + 1);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

/** Days on which a shop or freeze tip was already delivered. */
function sentTipDays(sent: string[]): string[] {
  const keys: string[] = [];
  for (const id of sent) {
    const kind = id.slice(0, id.indexOf(":"));
    if (kind !== "shopTip" && kind !== "freezeTip") continue;
    const key = keyOfId(id);
    if (key) keys.push(key);
  }
  return keys;
}

/** The most expensive paid item you can afford and do not own. */
export function bestAffordable(state: GoRealState): { name: string; price: number } | null {
  let best: { name: string; price: number } | null = null;
  for (const item of SHOP_ITEMS) {
    if (item.kind === "freeze" || item.price <= 0 || item.price > state.coins) continue;
    if (isOwned(item, state.owned, state.totalBreakMinutes)) continue;
    if (!best || item.price > best.price) best = { name: item.name, price: item.price };
  }
  return best;
}

/* ---------- the plan ---------- */

function dayCandidates(state: GoRealState, now: Date, offset: number, todayKey: string): Notif[] {
  const day = addDays(startOfDay(now), offset);
  const key = dayKey(day);
  const status = streakStatus(state.days, state, now);
  const out: Notif[] = [];

  // Tomorrow assumes today's outcome: the streak only carries over if today already counts.
  const future = offset > 0;
  const done = future ? false : status.todayDone;
  const onTrack = future ? false : status.todayOnTrack;
  const streak = future ? (status.todayDone ? status.count : 0) : status.count;

  const todayLog = state.days[todayKey];
  const goal = future ? state.breakGoal : goalsFor(todayLog, state).breakGoal;
  const minutes = future ? 0 : (todayLog?.breakMinutes ?? 0);
  const ctx: CopyCtx = {
    name: state.name,
    streak,
    goal,
    minutes,
    remaining: Math.max(0, goal - minutes),
    freezes: state.freezes,
    coins: state.coins,
  };
  const stamp = (kind: NotifKind, hour: number, minute: number, c: CopyCtx = ctx) =>
    out.push(make(kind, `${kind}:${key}`, atTime(day, hour, minute), c, day));

  if (!done) {
    const away = daysBetween(lastActiveKey(state.days, todayKey), day);
    if (COMEBACK_STEPS.includes(away)) stamp("comeback", state.notif.prefs.reminderHour, 0, { ...ctx, days: away });
    else stamp("nudge", state.notif.prefs.reminderHour, 0);

    if (streak > 0 && !onTrack) {
      stamp("streakRisk", ...TIMES.streakRisk);
      if (streak >= LAST_CALL_MIN_STREAK) stamp("lastCall", ...TIMES.lastCall);
    }
  }

  if (state.freezes === 0 && streak >= FREEZE_TIP_MIN_STREAK && state.coins >= FREEZE_PRICE) {
    stamp("freezeTip", ...TIMES.tip, { ...ctx, price: FREEZE_PRICE });
  } else {
    const pick = bestAffordable(state);
    if (pick) stamp("shopTip", ...TIMES.tip, { ...ctx, item: pick.name, price: pick.price });
  }

  return out;
}

/**
 * The notifications GoReal wants to deliver in the next `horizonDays` days (today counts as the first),
 * oldest first. Already delivered ones (ids in `notif.sent`) and past ones are left out.
 */
export function planNotifications(state: GoRealState, now: Date, horizonDays = 2): Notif[] {
  const prefs = state.notif.prefs;
  if (!state.onboarded || !prefs.enabled) return [];

  const nowMs = now.getTime();
  const todayKey = dayKey(now);
  const sent = new Set(state.notif.sent);
  const tipDays = sentTipDays(state.notif.sent);
  const plan: Notif[] = [];

  const brk = state.activeBreak;
  if (brk && allowed(prefs, "breakEnd")) {
    const at = brk.startedAt + brk.minutes * MINUTE;
    const id = `breakEnd:${brk.startedAt}`;
    if (at > nowMs && !sent.has(id)) {
      const ctx = buildCtx(state, now, { breakMinutes: brk.minutes, reward: rewardForBreak(brk.minutes, true).coins });
      const { title, body } = writeCopy("breakEnd", ctx, dayNumber(now));
      plan.push({ id, kind: "breakEnd", title, body, at, action: ACTIONS.breakEnd });
    }
  }

  for (let offset = 0; offset < horizonDays; offset++) {
    const key = dayKey(addDays(startOfDay(now), offset));
    let candidates = dayCandidates(state, now, offset, todayKey).filter((n) => allowed(prefs, n.kind));

    const tipBlocked = tipDays.some((k) => Math.abs(daysBetween(k, parseDayKey(key))) < TIP_SPACING_DAYS);
    if (tipBlocked) candidates = candidates.filter((n) => n.kind !== "shopTip" && n.kind !== "freezeTip");

    candidates = candidates.flatMap((n) => {
      if (!isQuiet(prefs.quiet, n.at)) return [n];
      return SHIFTABLE[n.kind] ? [{ ...n, at: quietEnd(prefs.quiet, n.at) }] : [];
    });

    // Already delivered today counts against the cap and the gap.
    const already = state.notif.inbox
      .filter((i) => sent.has(i.id) && KINDS[i.kind].type === "scheduled" && i.kind !== "breakEnd" && dayKey(new Date(i.at)) === key)
      .map((i) => i.at);
    const chosen: number[] = [...already];
    const picked: Notif[] = [];

    const ranked = candidates
      .filter((n) => !sent.has(n.id) && n.at > nowMs)
      .sort((a, b) => KINDS[b.kind].priority - KINDS[a.kind].priority || a.at - b.at);
    for (const n of ranked) {
      if (chosen.length >= DAILY_CAP) break;
      if (chosen.some((t) => Math.abs(t - n.at) < MIN_GAP_MINUTES * MINUTE)) continue;
      chosen.push(n.at);
      picked.push(n);
    }

    if (picked.some((n) => n.kind === "shopTip" || n.kind === "freezeTip")) tipDays.push(key);
    plan.push(...picked);
  }

  return plan.sort((a, b) => a.at - b.at);
}

/* ---------- things that just happened ---------- */

/**
 * Notifications about what changed: a streak that just ended, a milestone reached today.
 * Call this whenever the state changes. Each one has a stable id, so calling it again is harmless.
 */
export function detectEvents(state: GoRealState, now: Date): Notif[] {
  const prefs = state.notif.prefs;
  if (!state.onboarded || !prefs.enabled) return [];
  const sent = new Set(state.notif.sent);
  const status = streakStatus(state.days, state, now);
  const out: Notif[] = [];

  if (status.lostStreak > 0 && allowed(prefs, "streakLost")) {
    const n = eventNotif(state, "streakLost", { streak: status.lostStreak, best: Math.max(status.lostStreak, longestStreak(state.days, state, now)) }, now);
    if (!sent.has(n.id)) out.push(n);
  }

  if (status.todayDone && MILESTONES.includes(status.count) && allowed(prefs, "milestone")) {
    const n = eventNotif(state, "milestone", { milestone: status.count, streak: status.count }, now);
    if (!sent.has(n.id)) out.push(n);
  }
  return out;
}
