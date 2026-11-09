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
  /** Minutes of phone use without a pause, right now. */
  session?: number;
  /** 1 the first time a session gets long, 2 at twice the length, and so on. */
  step?: number;
  /** Today already counts for the streak. */
  done?: boolean;
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
  /** Phone time so far today, the limit and what is left, already written out ("48 min", "1 h"). */
  used?: string;
  limit?: string;
  left?: string;
  app?: string;
};

type Variant = { title: string; body: string; when?: (c: CopyCtx) => boolean };

const COPY: Record<NotifKind, Variant[]> = {
  longSession: [
    {
      title: "{session} minutes straight",
      body: "That is a long one. Put the phone down for a bit, Rilo will keep watch.",
      when: (c) => c.step === 1,
    },
    {
      title: "Rilo is yawning",
      body: "You have been on your phone for {session} minutes. Time to rest your eyes?",
      when: (c) => c.step === 1,
    },
    {
      title: "{session} minutes on your phone",
      body: "A {remaining} minute break now keeps your {streak}-day streak safe.",
      when: (c) => c.step === 1 && !c.done && c.streak > 0 && c.remaining > 0,
    },
    {
      title: "{session} minutes, {name}",
      body: "A {remaining} minute break now and today counts for your streak.",
      when: (c) => c.step === 1 && !c.done && c.streak === 0 && c.remaining > 0,
    },
    {
      title: "Today already counts",
      body: "Nice. But {session} minutes in a row is a lot. A short break?",
      when: (c) => c.step === 1 && c.done === true,
    },
    { title: "Still going?", body: "{session} minutes now. Even a 5 minute break helps.", when: (c) => (c.step ?? 0) >= 2 },
    {
      title: "Rilo fell asleep waiting",
      body: "{session} minutes without a pause. Your phone will still be here later.",
      when: (c) => (c.step ?? 0) >= 2,
    },
  ],

  limit80: [
    { title: "Almost at your limit", body: "You have used {used} of {limit} today." },
    { title: "Heads up", body: "{left} left before your phone limit." },
    {
      title: "{left} left today",
      body: "Stay under {limit} and your {streak}-day streak is safe.",
      when: (c) => !c.done && c.streak > 0,
    },
  ],

  limit100: [
    { title: "You hit your limit", body: "No worries. A {remaining} minute break still counts for today.", when: (c) => !c.done && c.remaining > 0 },
    {
      title: "Over your {limit} limit",
      body: "Your {streak}-day streak can still be saved: take a {remaining} minute break.",
      when: (c) => !c.done && c.streak > 0 && c.remaining > 0,
    },
    {
      title: "That is your {limit} for today",
      body: "Today already counts, so your streak is safe. Maybe call it a day?",
      when: (c) => c.done === true,
    },
  ],

  streakRisk: [
    {
      title: "Still up, {name}?",
      body: "Your {streak}-day streak is not safe yet. A {remaining} minute break saves it.",
      when: (c) => c.freezes === 0,
    },
    {
      title: "{streak} days on the line",
      body: "You are on your phone and today does not count yet. {remaining} min of break fixes that.",
      when: (c) => c.freezes === 0,
    },
    {
      title: "Your streak needs you",
      body: "A freeze would cover tonight, but a {remaining} minute break keeps it for later.",
      when: (c) => c.freezes > 0,
    },
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

  blockedApp: [
    { title: "{app} is off limits right now", body: "You are in a break. Go back to GoReal to finish it." },
    { title: "Rilo is awake", body: "Opening {app} ends your break. Come back within 10 seconds." },
  ],
};

export const MILESTONES = [3, 7, 14, 30, 50, 100];


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
