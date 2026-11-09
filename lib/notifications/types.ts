export type NotifKind =
  | "longSession"
  | "limit80"
  | "limit100"
  | "streakRisk"
  | "blockedApp"
  | "breakEnd"
  | "shopTip"
  | "freezeTip"
  | "freezeUsed"
  | "streakLost"
  | "milestone";

/** What the user can switch on or off. Every kind belongs to one category. */
export type NotifCategory = "usage" | "limit" | "streak" | "breaks" | "shop";

/**
 * Nothing is sent at a fixed time of day. Every notification is a reaction:
 * "usage" ones to how you are using your phone right now, "event" ones to something that just changed in GoReal.
 */
export type KindInfo = {
  category: NotifCategory;
  type: "usage" | "event";
  /** Counts toward the daily cap and the gap between nudges. */
  capped: boolean;
  /** Higher wins when two want to go out at the same moment. */
  priority: number;
};

export const KINDS: Record<NotifKind, KindInfo> = {
  blockedApp: { category: "breaks", type: "usage", capped: false, priority: 9 },
  streakRisk: { category: "streak", type: "usage", capped: true, priority: 6 },
  limit100: { category: "limit", type: "usage", capped: true, priority: 5 },
  longSession: { category: "usage", type: "usage", capped: true, priority: 4 },
  limit80: { category: "limit", type: "usage", capped: true, priority: 3 },
  breakEnd: { category: "breaks", type: "event", capped: false, priority: 9 },
  freezeUsed: { category: "streak", type: "event", capped: false, priority: 8 },
  streakLost: { category: "streak", type: "event", capped: false, priority: 7 },
  milestone: { category: "streak", type: "event", capped: false, priority: 7 },
  freezeTip: { category: "shop", type: "event", capped: false, priority: 2 },
  shopTip: { category: "shop", type: "event", capped: false, priority: 1 },
};

export const CATEGORY_INFO: Record<NotifCategory, { label: string; hint: string }> = {
  usage: { label: "Long sessions", hint: "When you have been on your phone for a long time without a pause." },
  limit: { label: "Phone limit", hint: "When you are close to your daily limit, and when you go over it." },
  streak: { label: "Streak alerts", hint: "When you are on your phone late and today does not count yet, and when your streak grows or is saved." },
  breaks: { label: "Breaks", hint: "When a break is over, and if you open an off-limits app during one." },
  shop: { label: "Shop tips", hint: "Right after a break, when you can afford something new. At most once every 4 days." },
};

export const CATEGORY_ORDER: NotifCategory[] = ["usage", "limit", "streak", "breaks", "shop"];

/** Where tapping a notification takes you. */
export type NotifAction = "home" | "shop" | "streak";

export type Notif = {
  /** Stable for the same thing on the same day, so it is never sent twice. */
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  /** When it should appear (ms since epoch). */
  at: number;
  action: NotifAction;
};

export type InboxItem = Notif & {
  read: boolean;
  /** The pop-up banner was already shown (or skipped) for this one. */
  shown: boolean;
};

export type QuietHours = { start: number; end: number };

export type NotifPrefs = {
  /** Master switch. Off means nothing is shown or sent. */
  enabled: boolean;
  categories: Record<NotifCategory, boolean>;
  /** A session this long (minutes without a pause) gets a nudge, and again at twice and three times as long. */
  sessionMinutes: number;
  /** No notifications between these hours. null = no quiet hours. */
  quiet: QuietHours | null;
};

export type NotifState = {
  prefs: NotifPrefs;
  inbox: InboxItem[];
  /** Ids already delivered, so nothing repeats. Oldest are dropped. */
  sent: string[];
  /** When the last nudges went out (ms), for the daily cap and the gap. Clearing the inbox does not reset it. */
  recent: number[];
};

export const SESSION_OPTIONS = [30, 45, 60];
export const QUIET_OPTIONS: (QuietHours | null)[] = [
  { start: 21, end: 9 },
  { start: 22, end: 8 },
  { start: 23, end: 7 },
  null,
];

/** At most this many nudges a day. Breaks, streak news and an off-limits app always get through. */
export const DAILY_CAP = 4;
/** Nudges are at least this far apart, so a long evening on the phone is not a stream of pings. */
export const MIN_GAP_MINUTES = 30;
export const MAX_INBOX = 30;
export const MAX_SENT = 120;
export const MAX_RECENT = 20;

export function defaultNotifState(): NotifState {
  return {
    prefs: {
      enabled: true,
      categories: { usage: true, limit: true, streak: true, breaks: true, shop: true },
      sessionMinutes: 45,
      quiet: { start: 22, end: 8 },
    },
    inbox: [],
    sent: [],
    recent: [],
  };
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function formatClockTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function quietLabel(q: QuietHours | null): string {
  return q ? `${formatHour(q.start)} to ${formatHour(q.end)}` : "Off";
}

/** Fills gaps in a saved notification state (older saves have none), keeping everything valid. */
export function mergeNotifState(raw: unknown): NotifState {
  const base = defaultNotifState();
  if (!raw || typeof raw !== "object") return base;
  const saved = raw as Partial<NotifState>;
  const prefs: Partial<NotifPrefs> = saved.prefs && typeof saved.prefs === "object" ? saved.prefs : {};
  const session = SESSION_OPTIONS.includes(prefs.sessionMinutes as number) ? (prefs.sessionMinutes as number) : base.prefs.sessionMinutes;
  const cats = (typeof prefs.categories === "object" ? prefs.categories : {}) as Record<string, boolean>;
  const categories = { ...base.prefs.categories };
  for (const c of CATEGORY_ORDER) if (typeof cats[c] === "boolean") categories[c] = cats[c];
  if (typeof cats.reminders === "boolean" && cats.usage === undefined) categories.usage = cats.reminders;
  const quiet = prefs.quiet === null ? null : validQuiet(prefs.quiet) ?? base.prefs.quiet;
  return {
    prefs: {
      enabled: typeof prefs.enabled === "boolean" ? prefs.enabled : base.prefs.enabled,
      categories,
      sessionMinutes: session,
      quiet,
    },
    inbox: Array.isArray(saved.inbox) ? saved.inbox.filter((i) => i && i.kind in KINDS).slice(0, MAX_INBOX) : [],
    sent: Array.isArray(saved.sent) ? saved.sent.filter((s) => typeof s === "string").slice(-MAX_SENT) : [],
    recent: Array.isArray(saved.recent) ? saved.recent.filter((t) => typeof t === "number").slice(-MAX_RECENT) : [],
  };
}

function validQuiet(q: unknown): QuietHours | null {
  if (!q || typeof q !== "object") return null;
  const { start, end } = q as QuietHours;
  const ok = (h: unknown) => typeof h === "number" && Number.isInteger(h) && h >= 0 && h <= 23;
  return ok(start) && ok(end) ? { start, end } : null;
}

/** Adds a delivered notification to the inbox (newest first) and remembers its id. Same id twice does nothing. */
export function withDelivered(notif: NotifState, n: Notif, shown: boolean): NotifState {
  if (notif.sent.includes(n.id)) return notif;
  return {
    ...notif,
    inbox: [{ ...n, read: false, shown }, ...notif.inbox].slice(0, MAX_INBOX),
    sent: [...notif.sent, n.id].slice(-MAX_SENT),
    recent: KINDS[n.kind].capped ? [...notif.recent, n.at].slice(-MAX_RECENT) : notif.recent,
  };
}

/** "now", "12 min ago", "3 h ago", "Yesterday 17:00" or the date. For the inbox. */
export function formatWhen(at: number, now: number): string {
  const minutes = Math.round((now - at) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min ago`;
  const a = new Date(at);
  const b = new Date(now);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOf(b) - startOf(a)) / 86_400_000);
  if (dayDiff === 0) return `${Math.floor(minutes / 60)} h ago`;
  if (dayDiff === 1) return `Yesterday ${formatClockTime(at)}`;
  return `${a.getDate()}/${a.getMonth() + 1} ${formatClockTime(at)}`;
}
