import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, dayKey } from "./lib/date.ts";
import { writeCopy, variantCount, COPY_KINDS } from "./lib/notifications/copy.ts";
import {
  breakEndNotif,
  detectEvents,
  eventNotif,
  isQuiet,
  simulateDay,
  usageTriggers,
} from "./lib/notifications/triggers.ts";
import {
  defaultNotifState,
  withDelivered,
  mergeNotifState,
  DAILY_CAP,
  MAX_INBOX,
  MAX_SENT,
  type NotifKind,
} from "./lib/notifications/types.ts";
import { usageSnapshot } from "./lib/usage.ts";

const at = (h: number, m = 0) => new Date(2026, 10, 9, h, m); // Monday
const NOW = at(15);
const MIN = 60_000;
const key = (off: number, from = NOW) => dayKey(addDays(from, off));

type Over = Record<string, unknown>;
function mk(over: Over = {}, doneDays: number[] = [], notif: Over = {}): any {
  const days: Record<string, any> = { [key(0)]: { breakMinutes: 0, goal: { phoneLimit: 60, breakGoal: 30 } } };
  for (const off of doneDays) days[key(off)] = { breakMinutes: 30, goal: { phoneLimit: 60, breakGoal: 30 } };
  const n = defaultNotifState();
  return {
    version: 1, onboarded: true, name: "Sam", phoneLimit: 60, breakGoal: 30, blockedApps: ["TikTok", "Instagram"],
    coins: 0, totalBreakMinutes: 0, completedBreaks: 0, quitBreaks: 0, longestBreak: 0,
    days, owned: [], outfit: null, face: null, background: null, title: "title-rookie",
    freezes: 0, freezesUsed: 0, freezeNotice: null, activeBreak: null, notice: null,
    notif: { ...n, prefs: { ...n.prefs, quiet: null }, ...notif },
    ...over,
  };
}
const withPrefs = (s: any, patch: Over) => ({ ...s, notif: { ...s.notif, prefs: { ...s.notif.prefs, ...patch } } });
const use = (todayMinutes: number, session: number | null = null, when = NOW, foregroundApp: string | null = null) => ({
  todayMinutes,
  session: session === null ? null : { startedAt: when.getTime() - session * MIN, minutes: session },
  foregroundApp,
});
const kinds = (list: any[]) => list.map((n) => n.kind);
const deliver = (s: any, n: any) => ({ ...s, notif: withDelivered(s.notif, n, true) });
const streak4 = [-1, -2, -3, -4];

test("nothing happens without phone use, and the master switch silences everything", () => {
  assert.deepEqual(usageTriggers(mk(), use(10, 5), NOW), []);
  assert.deepEqual(usageTriggers(withPrefs(mk(), { enabled: false }), use(60, 90), NOW), []);
  assert.deepEqual(usageTriggers(mk({ onboarded: false }), use(60, 90), NOW), []);
});

test("phone limit: heads up at 80%, then over the limit, never both at once", () => {
  assert.deepEqual(usageTriggers(mk(), use(47), NOW), []);
  const warn = usageTriggers(mk(), use(48), NOW);
  assert.deepEqual(kinds(warn), ["limit80"]);
  assert.equal(warn[0].id, `limit80:${key(0)}`);
  assert.match(warn[0].title + warn[0].body, /48 min|12 min/);

  assert.deepEqual(kinds(usageTriggers(mk(), use(75), NOW)), ["limit100"]);

  // after the warning, going over the limit waits for the gap, then goes out once
  const s = deliver(mk(), warn[0]);
  assert.deepEqual(usageTriggers(s, use(60, null, at(15, 10)), at(15, 10)), []);
  const over = usageTriggers(s, use(60, null, at(15, 31)), at(15, 31));
  assert.deepEqual(kinds(over), ["limit100"]);
  assert.deepEqual(usageTriggers(deliver(s, over[0]), use(80, null, at(17)), at(17)), []);
});

test("limit text depends on the streak and on today", () => {
  const withStreak = usageTriggers(mk({}, streak4), use(70), NOW)[0];
  assert.match(withStreak.body, /break/);
  const done = mk({}, streak4);
  done.days[key(0)].breakMinutes = 30;
  assert.match(usageTriggers(done, use(70), NOW)[0].body, /already counts/);
});

test("long session: at the chosen length, then twice and three times as long", () => {
  assert.deepEqual(usageTriggers(mk(), use(10, 44), NOW), []);
  const first = usageTriggers(mk(), use(10, 45), NOW);
  assert.deepEqual(kinds(first), ["longSession"]);
  assert.equal(first[0].id, `longSession:${NOW.getTime() - 45 * MIN}:1`);
  assert.match(first[0].title + first[0].body, /45/);

  const start = NOW.getTime() - 45 * MIN;
  let s = deliver(mk(), first[0]);
  const later = (minutes: number) => {
    const t = new Date(start + minutes * MIN);
    return usageTriggers(s, { todayMinutes: 10, session: { startedAt: start, minutes }, foregroundApp: null }, t);
  };
  assert.deepEqual(later(60), []);
  const second = later(90);
  assert.equal(second[0].id, `longSession:${start}:2`);
  assert.match(second[0].title + second[0].body, /90/);
  s = deliver(s, second[0]);
  assert.equal(later(135)[0].id, `longSession:${start}:3`);
  s = deliver(s, later(135)[0]);
  assert.deepEqual(later(400), []);

  assert.deepEqual(kinds(usageTriggers(withPrefs(mk(), { sessionMinutes: 30 }), use(10, 30), NOW)), ["longSession"]);
});

test("streak warning: only when on the phone in the evening with a streak and an unfinished day", () => {
  const evening = at(21);
  const risk = usageTriggers(mk({}, streak4), use(20, 20, evening), evening);
  assert.deepEqual(kinds(risk), ["streakRisk"]);
  assert.match(risk[0].title + risk[0].body, /4-day|4 days/);
  assert.deepEqual(usageTriggers(mk({}, streak4), use(20, 10, evening), evening), []);
  assert.deepEqual(usageTriggers(mk({}, streak4), use(20, 20, at(16)), at(16)), []);
  assert.deepEqual(usageTriggers(mk(), use(20, 20, evening), evening), []);
  const done = mk({}, streak4);
  done.days[key(0)].breakMinutes = 30;
  assert.deepEqual(usageTriggers(done, use(20, 20, evening), evening), []);
  assert.match(usageTriggers(mk({ freezes: 1 }, streak4), use(20, 20, evening), evening)[0].body, /freeze/);
  assert.doesNotMatch(risk[0].body, /freeze/);
});

test("one nudge per check, the most important first", () => {
  const evening = at(21);
  const first = usageTriggers(mk({}, streak4), use(70, 50, evening), evening);
  assert.deepEqual(kinds(first), ["streakRisk"]);
  const t = at(21, 31);
  const next = usageTriggers(deliver(mk({}, streak4), first[0]), use(80, 81, t), t);
  assert.deepEqual(kinds(next), ["limit100"]);
});

test("daily cap and gap, counted from delivery times, not the inbox", () => {
  const recent = [at(8).getTime(), at(10).getTime(), at(12).getTime(), at(14).getTime()];
  assert.equal(recent.length, DAILY_CAP);
  assert.deepEqual(usageTriggers(mk({}, [], { recent }), use(70), NOW), []);
  assert.deepEqual(usageTriggers(mk({}, [], { recent: [at(14, 50).getTime()] }), use(70), NOW), []);
  assert.deepEqual(kinds(usageTriggers(mk({}, [], { recent: [at(14, 29).getTime()] }), use(70), NOW)), ["limit100"]);
  const yesterday = recent.map((t) => t - 24 * 60 * MIN);
  assert.deepEqual(kinds(usageTriggers(mk({}, [], { recent: yesterday }), use(70), NOW)), ["limit100"]);

  // clearing the inbox does not reset the cap
  const s = mk({}, [], { recent, inbox: [] });
  assert.deepEqual(usageTriggers(s, use(70), NOW), []);
});

test("quiet hours silence nudges", () => {
  const night = at(23);
  const s = withPrefs(mk(), { quiet: { start: 22, end: 8 } });
  assert.ok(isQuiet({ start: 22, end: 8 }, night.getTime()));
  assert.ok(!isQuiet({ start: 22, end: 8 }, NOW.getTime()));
  assert.deepEqual(usageTriggers(s, use(70, 60, night), night), []);
  assert.deepEqual(kinds(usageTriggers(s, use(70), NOW)), ["limit100"]);
});

test("off-limits app during a break: right away, once, ignoring quiet hours and the cap", () => {
  const night = at(23);
  const brk = { startedAt: night.getTime() - 5 * MIN, minutes: 25 };
  const recent = [at(8).getTime(), at(10).getTime(), at(12).getTime(), at(14).getTime()];
  const s = withPrefs(mk({ activeBreak: brk }, [], { recent }), { quiet: { start: 22, end: 8 } });
  const hit = usageTriggers(s, use(70, 60, night, "TikTok"), night);
  assert.deepEqual(kinds(hit), ["blockedApp"]);
  assert.equal(hit[0].id, `blockedApp:${brk.startedAt}`);
  assert.match(hit[0].title + hit[0].body, /TikTok|awake/);
  assert.deepEqual(usageTriggers(deliver(s, hit[0]), use(70, 60, night, "TikTok"), night), []);
  assert.deepEqual(usageTriggers(s, use(70, 60, night, "Maps"), night), []);
  assert.deepEqual(usageTriggers(mk({ activeBreak: brk }), use(70, 90), NOW), []);
});

test("categories can be switched off, and sent ids never repeat", () => {
  const off = (cat: string) => withPrefs(mk(), { categories: { ...mk().notif.prefs.categories, [cat]: false } });
  assert.deepEqual(usageTriggers(off("limit"), use(70), NOW), []);
  assert.deepEqual(usageTriggers(off("usage"), use(10, 60), NOW), []);
  assert.deepEqual(kinds(usageTriggers(off("limit"), use(70, 60), NOW)), ["longSession"]);
  const n = usageTriggers(mk(), use(70), NOW)[0];
  const s = mk({}, [], { sent: [n.id] });
  assert.deepEqual(usageTriggers(s, use(70), NOW), []);
});

test("events: milestone once, lost streak once", () => {
  const s = mk({}, [0, -1, -2, -3, -4, -5, -6]);
  const ev = detectEvents(s, NOW);
  assert.deepEqual(kinds(ev), ["milestone"]);
  assert.match(ev[0].title, /week/i);
  s.notif.sent = [ev[0].id];
  assert.deepEqual(detectEvents(s, NOW), []);
  assert.deepEqual(detectEvents(mk({}, [0, -1, -2, -3]), NOW), []);

  const lost = mk({}, [-2, -3, -4, -5]);
  const l = detectEvents(lost, NOW);
  assert.deepEqual(kinds(l), ["streakLost"]);
  assert.match(l[0].title, /4-day/);
  lost.notif.sent = [l[0].id];
  assert.deepEqual(detectEvents(lost, NOW), []);
});

test("shop tips only right after earning coins, at most once every 4 days", () => {
  const before = mk({ coins: 200 });
  const after = mk({ coins: 260 });
  const tip = detectEvents(after, NOW, before);
  assert.deepEqual(kinds(tip), ["shopTip"]);
  assert.match(tip[0].body, /Cat ears/);
  assert.deepEqual(detectEvents(after, NOW), []);
  assert.deepEqual(detectEvents(mk({ coins: 260 }), NOW, mk({ coins: 255 })), []);
  const recent = mk({ coins: 260 }, [], { sent: [`shopTip:${key(-2)}`] });
  assert.deepEqual(detectEvents(recent, NOW, before), []);
  const old = mk({ coins: 260 }, [], { sent: [`shopTip:${key(-4)}`] });
  assert.deepEqual(kinds(detectEvents(old, NOW, before)), ["shopTip"]);

  const streak5 = [0, -1, -2, -3, -4];
  const freeze = detectEvents(mk({ coins: 260 }, streak5), NOW, mk({ coins: 200 }, streak5));
  assert.ok(kinds(freeze).includes("freezeTip"));
  assert.match(freeze.find((n) => n.kind === "freezeTip")!.body, /250/);
});

test("the welcome gift at the end of onboarding is not a reason for a shop tip", () => {
  const before = mk({ onboarded: false, coins: 0 });
  const after = mk({ onboarded: true, coins: 100 });
  assert.deepEqual(detectEvents(after, NOW, before), []);
  assert.deepEqual(kinds(detectEvents(mk({ coins: 260 }), NOW, mk({ coins: 200 }))), ["shopTip"]);
});

test("break end is the only notification with a time", () => {
  const brk = { startedAt: NOW.getTime(), minutes: 25 };
  const n = breakEndNotif(mk({ activeBreak: brk }), NOW)!;
  assert.equal(n.at, NOW.getTime() + 25 * MIN);
  assert.equal(n.id, `breakEnd:${brk.startedAt}`);
  assert.match(n.body, /30 coins|25 minutes/);
  assert.equal(breakEndNotif(mk(), NOW), null);
  assert.equal(breakEndNotif(withPrefs(mk({ activeBreak: brk }), { categories: { ...mk().notif.prefs.categories, breaks: false } }), NOW), null);
});

test("usage snapshot: totals, sessions and the app on screen", () => {
  const t = (h: number, m: number) => at(h, m).getTime();
  const list = [
    { app: "TikTok", start: t(9, 0), end: t(9, 20) },
    { app: "Instagram", start: t(9, 10), end: t(9, 30) },
    { app: "TikTok", start: t(9, 32), end: t(9, 50) },
    { app: "TikTok", start: t(10, 0), end: t(10, 5) },
    { app: "TikTok", start: t(8, 0) - 24 * 60 * MIN, end: t(8, 30) - 24 * 60 * MIN },
  ];
  const mid = usageSnapshot(list, t(9, 50));
  assert.equal(mid.todayMinutes, 48);
  assert.deepEqual(mid.session, { startedAt: t(9, 0), minutes: 50 });
  assert.equal(mid.foregroundApp, "TikTok");

  const after = usageSnapshot(list, t(10, 5));
  assert.equal(after.todayMinutes, 53);
  assert.deepEqual(after.session, { startedAt: t(10, 0), minutes: 5 });

  const idle = usageSnapshot(list, t(11, 0));
  assert.equal(idle.session, null);
  assert.equal(idle.foregroundApp, null);
  const running = usageSnapshot([{ app: "TikTok", start: t(9, 0), end: t(12, 0) }], t(9, 30));
  assert.equal(running.todayMinutes, 30);
});

test("a simulated day respects the cap, the gap and quiet hours", () => {
  const t = (h: number, m: number) => at(h, m).getTime();
  const day = [
    { app: "TikTok", start: t(7, 40), end: t(7, 55) },
    { app: "TikTok", start: t(12, 10), end: t(12, 35) },
    { app: "TikTok", start: t(16, 0), end: t(17, 10) },
    { app: "TikTok", start: t(19, 0), end: t(19, 20) },
    { app: "TikTok", start: t(21, 5), end: t(21, 40) },
    { app: "TikTok", start: t(22, 30), end: t(23, 50) },
  ];
  const s = withPrefs(mk({}, streak4), { quiet: { start: 22, end: 8 } });
  const fired = simulateDay(s, day, NOW);
  assert.ok(fired.length > 0 && fired.length <= DAILY_CAP, `fired ${fired.length}`);
  for (let i = 1; i < fired.length; i++) assert.ok(fired[i].at - fired[i - 1].at >= 30 * MIN);
  assert.ok(fired.every((n) => new Date(n.at).getHours() < 22));
  assert.deepEqual(kinds(fired), ["limit80", "limit100", "longSession", "streakRisk"]);
});

test("copy: every kind fills every placeholder, no emoji, short enough", () => {
  const ctx = {
    name: "Sam", streak: 6, goal: 30, remaining: 20, minutes: 10, freezes: 0, coins: 400, milestone: 7, best: 9,
    daysWord: "a day", leftText: "x", item: "Cat ears", price: 250, reward: 36, breakMinutes: 30,
    used: "48 min", limit: "1 h", left: "12 min", app: "TikTok", session: 45, step: 1, done: false,
  };
  const emoji = /\p{Extended_Pictographic}/u;
  for (const kind of COPY_KINDS as NotifKind[]) {
    for (const freezes of [0, 1]) for (const step of [1, 2, 3]) for (const done of [false, true]) for (const streak of [0, 6]) {
      for (const milestone of [3, 7, 14, 30, 50, 100]) for (let seed = 0; seed < 6; seed++) {
        const { title, body } = writeCopy(kind, { ...ctx, freezes, step, done, streak, milestone }, seed);
        assert.ok(title.length > 0 && body.length > 0, kind);
        assert.doesNotMatch(title + body, /[{}]|undefined|NaN/, `${kind}: ${title} / ${body}`);
        assert.doesNotMatch(title + body, emoji);
        assert.ok(title.length <= 40, `${kind} title too long: ${title}`);
        assert.ok(body.length <= 110, `${kind} body too long: ${body}`);
      }
    }
  }
  assert.ok(variantCount("longSession", ctx) >= 3);
  const rotated = new Set([0, 1, 2, 3].map((i) => writeCopy("longSession", ctx, i).title));
  assert.ok(rotated.size > 1);
});

test("state helpers: dedupe, trimming, cap times and migration", () => {
  const base = defaultNotifState();
  const n = { id: "limit80:1", kind: "limit80" as const, title: "t", body: "b", at: 1, action: "home" as const };
  const once = withDelivered(base, n, false);
  assert.equal(once.inbox.length, 1);
  assert.deepEqual(once.recent, [1]);
  assert.equal(withDelivered(once, n, true), once);
  assert.deepEqual(withDelivered(base, { ...n, id: "milestone:1", kind: "milestone" as const }, true).recent, []);
  let big = base;
  for (let i = 0; i < MAX_SENT + 50; i++) big = withDelivered(big, { ...n, id: `x:${i}` }, true);
  assert.equal(big.inbox.length, MAX_INBOX);
  assert.equal(big.sent.length, MAX_SENT);

  assert.deepEqual(mergeNotifState(undefined), base);
  const old = mergeNotifState({
    prefs: { enabled: false, reminderHour: 17, categories: { reminders: false, shop: false } },
    inbox: [{ ...n, id: "nudge:1", kind: "nudge", read: false, shown: true }, { ...n, read: false, shown: true }],
  });
  assert.equal(old.prefs.enabled, false);
  assert.equal(old.prefs.categories.usage, false);
  assert.equal(old.prefs.categories.shop, false);
  assert.equal(old.prefs.categories.streak, true);
  assert.equal(old.prefs.sessionMinutes, 45);
  assert.equal(old.inbox.length, 1);
  assert.deepEqual(old.recent, []);
  assert.equal(mergeNotifState({ prefs: { quiet: null } }).prefs.quiet, null);
  assert.equal(mergeNotifState({ prefs: { sessionMinutes: 7 } }).prefs.sessionMinutes, 45);
});

test("eventNotif ids", () => {
  const s = mk({}, [-1, -2]);
  assert.equal(eventNotif(s, "freezeUsed", { streak: 9, daysWord: "a day", leftText: "You have 1 left." }, NOW).id, `freezeUsed:${key(0)}`);
  assert.equal(eventNotif(s, "blockedApp", { app: "X" }, NOW, "123").id, "blockedApp:123");
});
