import type { NotifKind } from "./types";

/**
 * Everything a notification can say. Fill-ins are written as {name}.
 * Tone: friendly and short, never guilt. Rilo is a small mascot, not a drill sergeant.
 * Each kind has several variants and a different one is picked each day, so it never feels like a script.
 */
export type CopyCtx = {
  name: string;
  /** Streak length in days. */
  streak: number;
  /** Break goal in minutes. */
  goal: number;
  /** Break minutes still needed today. */
  remaining: number;
  /** Break minutes done today. */
  minutes: number;
  freezes: number;
  coins: number;
  /** Comeback: days since last activity. */
  days?: number;
  /** Streak milestone that was just reached. */
  milestone?: number;
  best?: number;
  /** "a day" or "2 days" */
  daysWord?: string;
  /** "You have 1 left." or "That was your last one." */
  leftText?: string;
  item?: string;
  price?: number;
  reward?: number;
  breakMinutes?: number;
  used?: number;
  limit?: number;
  left?: number;
  app?: string;
};

type Variant = { title: string; body: string; when?: (c: CopyCtx) => boolean };

const COPY: Record<NotifKind, Variant[]> = {
  nudge: [
    { title: "Rilo is getting sleepy", body: "{goal} minutes off your phone puts him to bed and counts for today." },
    { title: "Time for a break, {name}?", body: "Start a short one. Even 10 minutes earns coins." },
    { title: "Rilo misses you", body: "Put the phone down for a bit. He will nap while you do." },
    { title: "Quick break?", body: "Your phone will still be here in {goal} minutes." },
    { title: "Keep your {streak}-day streak", body: "One break today and it keeps going.", when: (c) => c.streak > 0 },
    {
      title: "{remaining} min to go",
      body: "You already did {minutes}. A bit more and today counts.",
      when: (c) => c.minutes > 0 && c.remaining > 0,
    },
  ],

  streakRisk: [
    {
      title: "Your {streak}-day streak is at risk",
      body: "One break today keeps it alive. {remaining} min to go.",
      when: (c) => c.freezes === 0,
    },
    { title: "{streak} days on the line", body: "A {remaining} minute break saves it.", when: (c) => c.freezes === 0 },
    {
      title: "Do not let {streak} days slip",
      body: "Take a short break before bed.",
      when: (c) => c.freezes === 0,
    },
    {
      title: "Your streak needs you",
      body: "You have a freeze for tonight, but a break keeps it for later.",
      when: (c) => c.freezes > 0,
    },
    {
      title: "{streak} days, and a freeze as backup",
      body: "Take a break and keep the freeze for another day.",
      when: (c) => c.freezes > 0,
    },
  ],

  lastCall: [
    {
      title: "Last call for your streak",
      body: "It ends at midnight. {remaining} minutes is all it takes.",
      when: (c) => c.freezes === 0,
    },
    {
      title: "Your {streak}-day streak ends tonight",
      body: "A break of {remaining} minutes still counts. Go now.",
      when: (c) => c.freezes === 0,
    },
    {
      title: "Last call",
      body: "A freeze will cover tonight. A break would keep it for later.",
      when: (c) => c.freezes > 0,
    },
    {
      title: "Almost midnight",
      body: "You are covered by a freeze, but a break is free.",
      when: (c) => c.freezes > 0,
    },
  ],

  comeback: [
    { title: "Rilo is a bit lonely", body: "It has been {days} days. One short break and you are back.", when: (c) => c.days === 2 },
    { title: "Come back when you are ready", body: "No pressure. Even 5 minutes starts a new streak.", when: (c) => c.days === 4 },
    { title: "A week already?", body: "You have {coins} coins waiting in the shop.", when: (c) => c.days === 7 },
    { title: "Rilo is still here", body: "Whenever you want to start again, he will be napping.", when: (c) => c.days === 14 },
  ],

  breakEnd: [
    { title: "Break done", body: "You earned {reward} coins. Come back to collect them." },
    { title: "Rilo woke up", body: "{breakMinutes} minutes off your phone. Nice one, {name}." },
  ],

  shopTip: [
    { title: "You can afford something new", body: "{coins} coins is enough for {item}." },
    { title: "New look for Rilo?", body: "{item} costs {price} and you have {coins}." },
  ],

  freezeTip: [
    {
      title: "Protect your streak",
      body: "{streak} days is worth keeping. A freeze costs {price} coins and you have {coins}.",
    },
    { title: "No freezes left", body: "Get one for {price} coins. It covers a missed day." },
  ],

  freezeUsed: [
    { title: "A freeze saved your streak", body: "You missed {daysWord}, so your {streak}-day streak is still alive. {leftText}" },
  ],

  streakLost: [
    { title: "Your {streak}-day streak ended", body: "It happens. One break today starts a new one. Your best is {best}." },
  ],

  milestone: [
    { title: "3 days in a row", body: "That is a streak. Keep it going.", when: (c) => c.milestone === 3 },
    { title: "A full week", body: "7 days in a row. Rilo is proud of you.", when: (c) => c.milestone === 7 },
    { title: "Two weeks", body: "14 days. That is a real habit.", when: (c) => c.milestone === 14 },
    { title: "30 day streak", body: "A whole month. You are a legend, {name}.", when: (c) => c.milestone === 30 },
    { title: "50 days", body: "Half way to 100.", when: (c) => c.milestone === 50 },
    { title: "100 days", body: "Triple digits. Unreal.", when: (c) => c.milestone === 100 },
  ],

  limit80: [
    { title: "Almost at your limit", body: "You have used {used} of {limit} today." },
    { title: "Heads up", body: "{left} left before your phone limit." },
  ],

  limit100: [
    { title: "You hit your limit", body: "No worries. A break today still keeps your streak alive." },
    { title: "Over your limit today", body: "Tomorrow is a fresh start. A break still counts for today." },
  ],

  blockedApp: [
    { title: "{app} is off limits right now", body: "You are in a break. Go back to GoReal to finish it." },
    { title: "Rilo is awake", body: "Opening {app} ends your break. Come back within 10 seconds." },
  ],
};

export const MILESTONES = [3, 7, 14, 30, 50, 100];

/** The days since last activity that trigger a comeback message. After the last one we stay quiet. */
export const COMEBACK_STEPS = [2, 4, 7, 14];

function fill(text: string, ctx: CopyCtx): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = (ctx as Record<string, unknown>)[key];
    return value === undefined ? "" : String(value);
  });
}

/** Write one notification. `seed` (e.g. the day number) rotates the variants. */
export function writeCopy(kind: NotifKind, ctx: CopyCtx, seed: number): { title: string; body: string } {
  const eligible = COPY[kind].filter((v) => !v.when || v.when(ctx));
  const pool = eligible.length > 0 ? eligible : COPY[kind];
  const variant = pool[Math.abs(seed) % pool.length];
  return { title: fill(variant.title, ctx), body: fill(variant.body, ctx) };
}

/** Number of variants that could be shown for this context (for tests and the preview screen). */
export function variantCount(kind: NotifKind, ctx: CopyCtx): number {
  return COPY[kind].filter((v) => !v.when || v.when(ctx)).length;
}

export const COPY_KINDS = Object.keys(COPY) as NotifKind[];
