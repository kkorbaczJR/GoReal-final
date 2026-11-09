/**
 * Decides when GoReal speaks up. Nothing is planned for a time of day: every notification is a reaction to
 * how the phone is being used right now (a long session, getting close to the limit, an off-limits app during
 * a break) or to something that just changed in GoReal (a streak saved, a milestone, a new thing you can afford).
 *
 * Pure functions: no DOM, no storage, no clock. The same code runs in the web app now and in the Android
 * tracker later, which calls `usageTriggers` every time it has fresh usage data. Only `import type` from the store.
 */
import { dayKey, formatMinutes, parseDayKey } from "../date";
import { goalsFor, longestStreak, rewardForBreak, streakStatus } from "../rules";
import { FREEZE_PRICE, SHOP_ITEMS, isOwned } from "../shop";
import type { GoRealState } from "../store";
import { usageSnapshot, type UsageInterval, type UsageSnapshot } from "../usage";
import { MILESTONES, writeCopy, type CopyCtx } from "./copy";
import {
  DAILY_CAP,
  KINDS,
  MIN_GAP_MINUTES,
  withDelivered,
  type Notif,
  type NotifAction,
  type NotifKind,
  type NotifPrefs,
  type QuietHours,
} from "./types";

const MINUTE = 60_000;
const DAY_MS = 24 * 60 * MINUTE;

/** "Almost at your limit" goes out at this share of the daily limit. */
export const LIMIT_WARNING_SHARE = 0.8;
/** Streak warnings only come while you are on your phone in the evening, for at least this long. */
export const RISK_FROM_HOUR = 20;
export const RISK_SESSION_MINUTES = 15;
/** A long session is nudged at 1x, 2x and 3x the chosen length, then Rilo gives up for that session. */
export const MAX_SESSION_STEPS = 3;
/** A shop or freeze tip goes out at most once in this many days. */
export const TIP_SPACING_DAYS = 4;
export const FREEZE_TIP_MIN_STREAK = 5;

const ACTIONS: Record<NotifKind, NotifAction> = {
  longSession: "home",
  limit80: "home",
  limit100: "home",
  streakRisk: "home",
  blockedApp: "home",
  breakEnd: "home",
  shopTip: "shop",
  freezeTip: "shop",
  freezeUsed: "streak",
  streakLost: "streak",
  milestone: "streak",
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

/** Is this moment inside quiet hours? Handles ranges that cross midnight, like 22 to 8. */
export function isQuiet(quiet: QuietHours | null, ms: number): boolean {
  if (!quiet || quiet.start === quiet.end) return false;
  const h = new Date(ms).getHours();
  return quiet.start > quiet.end ? h >= quiet.start || h < quiet.end : h >= quiet.start && h < quiet.end;
}

/** Can this kind be delivered at all, as far as the user's settings go? */
export function allowed(prefs: NotifPrefs, kind: NotifKind): boolean {
  return prefs.enabled && prefs.categories[KINDS[kind].category];
}

/** Everything the copy needs, for the day of `now`. Pass `extra` to add or override fields. */
export function buildCtx(state: GoRealState, now: Date, extra: Partial<CopyCtx> = {}): CopyCtx {
  const today = state.days[dayKey(now)];
  const goal = goalsFor(today, state).breakGoal;
  const minutes = today?.breakMinutes ?? 0;
  const status = streakStatus(state.days, state, now);
  return {
    name: state.name,
    streak: status.count,
    done: status.todayDone,
    goal,
    minutes,
    remaining: Math.max(0, goal - minutes),
    freezes: state.freezes,
    coins: state.coins,
    ...extra,
  };
}

/**
 * Builds one notification. The id is `kind:key`; the same id is never delivered twice.
 * The key is the day unless you pass one (a session start, a break start).
 */
export function eventNotif(
  state: GoRealState,
  kind: NotifKind,
  extra: Partial<CopyCtx> = {},
  now: Date = new Date(),
  key: string = dayKey(now),
): Notif {
  const { title, body } = writeCopy(kind, buildCtx(state, now, extra), dayNumber(now));
  return { id: `${kind}:${key}`, kind, title, body, at: now.getTime(), action: ACTIONS[kind] };
}

/** The most expensive paid item you can afford and do not own. */
export function bestAffordable(state: Pick<GoRealState, "coins" | "owned" | "totalBreakMinutes">) {
  let best: { name: string; price: number } | null = null;
  for (const item of SHOP_ITEMS) {
    if (item.kind === "freeze" || item.price <= 0 || item.price > state.coins) continue;
    if (isOwned(item, state.owned, state.totalBreakMinutes)) continue;
    if (!best || item.price > best.price) best = { name: item.name, price: item.price };
  }
  return best;
}

/** Nudges already sent today count against the cap, and the last one sets the gap. */
function capReached(state: GoRealState, nowMs: number): boolean {
  const dayStart = startOfDay(new Date(nowMs)).getTime();
  const today = state.notif.recent.filter((t) => t >= dayStart && t <= nowMs);
  return today.length >= DAILY_CAP || today.some((t) => nowMs - t < MIN_GAP_MINUTES * MINUTE);
}

/* ---------- reacting to phone use ---------- */

/**
 * What to send right now, given how the phone is being used. Call it whenever usage data changes
 * (the Android tracker does this in the background; the web app after you log phone time).
 * Returns at most one nudge per call, plus the off-limits-app alert during a break.
 */
export function usageTriggers(state: GoRealState, usage: UsageSnapshot, now: Date): Notif[] {
  const prefs = state.notif.prefs;
  if (!state.onboarded || !prefs.enabled) return [];
  const nowMs = now.getTime();
  const sent = new Set(state.notif.sent);

  // During a break only one thing matters: an off-limits app on screen. It ignores quiet hours and the cap.
  const brk = state.activeBreak;
  if (brk) {
    const app = usage.foregroundApp;
    if (!app || !state.blockedApps.includes(app) || !allowed(prefs, "blockedApp")) return [];
    const n = eventNotif(state, "blockedApp", { app }, now, String(brk.startedAt));
    return sent.has(n.id) ? [] : [n];
  }

  if (isQuiet(prefs.quiet, nowMs) || capReached(state, nowMs)) return [];

  const key = dayKey(now);
  const status = streakStatus(state.days, state, now);
  const limit = goalsFor(state.days[key], state).phoneLimit;
  const used = usage.todayMinutes;
  const ctx: Partial<CopyCtx> = {
    used: formatMinutes(used),
    limit: formatMinutes(limit),
    left: formatMinutes(Math.max(0, limit - used)),
    session: usage.session?.minutes,
  };

  const candidates: Notif[] = [];
  if (used >= limit) candidates.push(eventNotif(state, "limit100", ctx, now));
  else if (used >= Math.ceil(limit * LIMIT_WARNING_SHARE)) candidates.push(eventNotif(state, "limit80", ctx, now));

  const session = usage.session;
  if (session && session.minutes >= prefs.sessionMinutes) {
    const step = Math.min(MAX_SESSION_STEPS, Math.floor(session.minutes / prefs.sessionMinutes));
    candidates.push(eventNotif(state, "longSession", { ...ctx, step }, now, `${session.startedAt}:${step}`));
  }

  const late = now.getHours() >= RISK_FROM_HOUR;
  if (session && late && session.minutes >= RISK_SESSION_MINUTES && status.count > 0 && !status.todayDone) {
    candidates.push(eventNotif(state, "streakRisk", ctx, now));
  }

  const pick = candidates
    .filter((n) => allowed(prefs, n.kind) && !sent.has(n.id))
    .sort((a, b) => KINDS[b.kind].priority - KINDS[a.kind].priority)[0];
  return pick ? [pick] : [];
}

/* ---------- reacting to GoReal itself ---------- */

function tipSentRecently(sent: string[], now: Date): boolean {
  return sent.some((id) => {
    const kind = id.slice(0, id.indexOf(":"));
    if (kind !== "shopTip" && kind !== "freezeTip") return false;
    const key = id.slice(id.indexOf(":") + 1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    return Math.abs(dayNumber(now) - dayNumber(parseDayKey(key))) < TIP_SPACING_DAYS;
  });
}

/**
 * Notifications about what just changed: a streak that ended, a milestone reached today, and (when `prev`
 * is given) something new you can afford after earning coins. Call it whenever the state changes.
 * Each one has a stable id, so calling it again is harmless.
 */
export function detectEvents(state: GoRealState, now: Date, prev?: GoRealState): Notif[] {
  const prefs = state.notif.prefs;
  if (!state.onboarded || !prefs.enabled) return [];
  const sent = new Set(state.notif.sent);
  const status = streakStatus(state.days, state, now);
  const out: Notif[] = [];
  const add = (n: Notif) => {
    if (!sent.has(n.id)) out.push(n);
  };

  if (status.lostStreak > 0 && allowed(prefs, "streakLost")) {
    const best = Math.max(status.lostStreak, longestStreak(state.days, state, now));
    add(eventNotif(state, "streakLost", { streak: status.lostStreak, best }, now));
  }

  if (status.todayDone && MILESTONES.includes(status.count) && allowed(prefs, "milestone")) {
    add(eventNotif(state, "milestone", { milestone: status.count, streak: status.count }, now));
  }

  const earned = prev && state.coins > prev.coins;
  if (prev && earned && !tipSentRecently(state.notif.sent, now)) {
    const freezeNow = state.freezes === 0 && status.count >= FREEZE_TIP_MIN_STREAK;
    if (freezeNow && prev.coins < FREEZE_PRICE && state.coins >= FREEZE_PRICE && allowed(prefs, "freezeTip")) {
      add(eventNotif(state, "freezeTip", { price: FREEZE_PRICE }, now));
    } else if (allowed(prefs, "shopTip")) {
      const pick = bestAffordable(state);
      if (pick && pick.price > prev.coins) add(eventNotif(state, "shopTip", { item: pick.name, price: pick.price }, now));
    }
  }
  return out;
}

/**
 * The one notification with a time: the end of a break you started yourself. The phone app hands it to the
 * system when the break starts (so it arrives with the screen locked) and cancels it if you quit.
 */
export function breakEndNotif(state: GoRealState, now: Date): Notif | null {
  const brk = state.activeBreak;
  if (!brk || !state.onboarded || !allowed(state.notif.prefs, "breakEnd")) return null;
  const at = brk.startedAt + brk.minutes * MINUTE;
  const ctx = buildCtx(state, now, { breakMinutes: brk.minutes, reward: rewardForBreak(brk.minutes, true).coins });
  const { title, body } = writeCopy("breakEnd", ctx, dayNumber(now));
  return { id: `breakEnd:${brk.startedAt}`, kind: "breakEnd", title, body, at, action: ACTIONS.breakEnd };
}

/* ---------- a whole day, for the preview ---------- */

/**
 * Plays a day of phone use minute by minute through `usageTriggers`, as if the tracker reported live,
 * and returns everything that would have gone out. No breaks are taken during the day.
 */
export function simulateDay(state: GoRealState, intervals: UsageInterval[], day: Date): Notif[] {
  const start = startOfDay(day).getTime();
  const key = dayKey(day);
  let sim: GoRealState = { ...state, activeBreak: null, notif: { ...state.notif, inbox: [], sent: [], recent: [] } };
  const out: Notif[] = [];
  for (let t = start; t < start + DAY_MS; t += MINUTE) {
    const usage = usageSnapshot(intervals, t);
    const today = { ...(sim.days[key] ?? { breakMinutes: 0 }), phoneMinutes: usage.todayMinutes };
    sim = { ...sim, days: { ...sim.days, [key]: today } };
    for (const n of usageTriggers(sim, usage, new Date(t))) {
      out.push(n);
      sim = { ...sim, notif: withDelivered(sim.notif, n, true) };
    }
  }
  return out;
}
