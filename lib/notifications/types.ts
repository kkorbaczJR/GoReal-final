export type NotifKind =
  | "nudge"
  | "streakRisk"
  | "lastCall"
  | "comeback"
  | "breakEnd"
  | "shopTip"
  | "freezeTip"
  | "freezeUsed"
  | "streakLost"
  | "milestone"
  | "limit80"
  | "limit100"
  | "blockedApp";

/** What the user can switch on or off. Every kind belongs to one category. */
export type NotifCategory = "reminders" | "streak" | "breaks" | "shop" | "limit";

/** "scheduled" ones are planned ahead for a time of day. "event" ones happen because something just changed. */
export type KindInfo = {
  category: NotifCategory;
  type: "scheduled" | "event";
  /** Higher wins when the daily cap forces a choice. */
  priority: number;
};

export const KINDS: Record<NotifKind, KindInfo> = {
  lastCall: { category: "streak", type: "scheduled", priority: 6 },
  streakRisk: { category: "streak", type: "scheduled", priority: 5 },
  comeback: { category: "reminders", type: "scheduled", priority: 4 },
  nudge: { category: "reminders", type: "scheduled", priority: 4 },
  freezeTip: { category: "shop", type: "scheduled", priority: 2 },
  shopTip: { category: "shop", type: "scheduled", priority: 1 },
  breakEnd: { category: "breaks", type: "scheduled", priority: 9 },
  freezeUsed: { category: "streak", type: "event", priority: 8 },
  streakLost: { category: "streak", type: "event", priority: 7 },
  milestone: { category: "streak", type: "event", priority: 7 },
  limit80: { category: "limit", type: "event", priority: 6 },
  limit100: { category: "limit", type: "event", priority: 6 },
  blockedApp: { category: "limit", type: "event", priority: 9 },
};

export const CATEGORY_INFO: Record<NotifCategory, { label: string; hint: string }> = {
  reminders: { label: "Daily reminder", hint: "One nudge a day, and a gentle hello if you have been away." },
  streak: { label: "Streak alerts", hint: "When your streak is at risk, and when it grows or is saved." },
  breaks: { label: "Break finished", hint: "Tells you when your break is over." },
  shop: { label: "Shop tips", hint: "Now and then, when you can afford something. At most once every 4 days." },
  limit: { label: "Phone limit", hint: "Heads up near your limit, and when an off-limits app opens." },
};

export const CATEGORY_ORDER: NotifCategory[] = ["reminders", "streak", "breaks", "shop", "limit"];

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
  /** Master switch. Off means nothing is planned, shown or sent. */
  enabled: boolean;
  categories: Record<NotifCategory, boolean>;
  /** Hour of the day (0 to 23) for the daily reminder. */
  reminderHour: number;
  /** No notifications between these hours. null = no quiet hours. */
  quiet: QuietHours | null;
};

export type NotifState = {
  prefs: NotifPrefs;
  inbox: InboxItem[];
  /** Ids already delivered, so nothing repeats. Oldest are dropped. */
  sent: string[];
};

export const REMINDER_HOURS = [15, 16, 17, 18, 19];
export const QUIET_OPTIONS: (QuietHours | null)[] = [
  { start: 21, end: 9 },
  { start: 22, end: 8 },
  { start: 23, end: 7 },
  null,
];

/** At most this many scheduled notifications a day (a finished break always gets through). */
export const DAILY_CAP = 3;
/** Scheduled notifications are at least this far apart. */
export const MIN_GAP_MINUTES = 90;
export const MAX_INBOX = 30;
export const MAX_SENT = 120;

export function defaultNotifState(): NotifState {
  return {
    prefs: {
      enabled: true,
      categories: { reminders: true, streak: true, breaks: true, shop: true, limit: true },
      reminderHour: 17,
      quiet: { start: 22, end: 8 },
    },
    inbox: [],
    sent: [],
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
  return q ? `${q.start}:00 to ${q.end}:00` : "Off";
}

/** Fills gaps in a saved notification state (older saves have none), keeping everything valid. */
export function mergeNotifState(raw: unknown): NotifState {
  const base = defaultNotifState();
  if (!raw || typeof raw !== "object") return base;
  const saved = raw as Partial<NotifState>;
  const prefs: Partial<NotifPrefs> = saved.prefs && typeof saved.prefs === "object" ? saved.prefs : {};
  const hour = typeof prefs.reminderHour === "number" ? Math.min(23, Math.max(0, Math.floor(prefs.reminderHour))) : base.prefs.reminderHour;
  const quiet = prefs.quiet === null ? null : validQuiet(prefs.quiet) ?? base.prefs.quiet;
  return {
    prefs: {
      enabled: typeof prefs.enabled === "boolean" ? prefs.enabled : base.prefs.enabled,
      categories: { ...base.prefs.categories, ...(typeof prefs.categories === "object" ? prefs.categories : {}) },
      reminderHour: hour,
      quiet,
    },
    inbox: Array.isArray(saved.inbox) ? saved.inbox.slice(0, MAX_INBOX) : [],
    sent: Array.isArray(saved.sent) ? saved.sent.filter((s) => typeof s === "string").slice(-MAX_SENT) : [],
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
  };
}
