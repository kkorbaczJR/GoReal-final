import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, dayKey } from "./lib/date.ts";
import { writeCopy, variantCount, COPY_KINDS } from "./lib/notifications/copy.ts";
import { detectEvents, eventNotif, planNotifications, isQuiet, quietEnd } from "./lib/notifications/planner.ts";
import { defaultNotifState, withDelivered, mergeNotifState, MAX_INBOX, MAX_SENT, type NotifKind } from "./lib/notifications/types.ts";

const NOW = new Date(2026, 10, 9, 10, 0); // Monday 10:00
const key = (off: number, from = NOW) => dayKey(addDays(from, off));

type Over = Record<string, unknown>;
function mk(over: Over = {}, doneDays: number[] = [], notif: Over = {}): any {
  const days: Record<string, any> = { [key(0)]: { breakMinutes: 0, goal: { phoneLimit: 60, breakGoal: 30 } } };
  for (const off of doneDays) days[key(off)] = { breakMinutes: 30, goal: { phoneLimit: 60, breakGoal: 30 } };
  const n = defaultNotifState();
  return {
    version: 1, onboarded: true, name: "Sam", phoneLimit: 60, breakGoal: 30, blockedApps: [],
    coins: 0, totalBreakMinutes: 0, completedBreaks: 0, quitBreaks: 0, longestBreak: 0,
    days, owned: [], outfit: null, face: null, background: null, title: "title-rookie",
    freezes: 0, freezesUsed: 0, freezeNotice: null, activeBreak: null, notice: null,
    notif: { ...n, prefs: { ...n.prefs, quiet: null }, ...notif },
    ...over,
  };
}
const withPrefs = (s: any, patch: Over) => ({ ...s, notif: { ...s.notif, prefs: { ...s.notif.prefs, ...patch } } });
const kinds = (plan: any[]) => plan.map((p) => p.kind);
const hhmm = (ms: number) => new Date(ms).toTimeString().slice(0, 5);
const today = (plan: any[]) => plan.filter((p) => dayKey(new Date(p.at)) === key(0));
const streak5 = [-1, -2, -3, -4, -5];

test("new user: nudge today at reminder hour and tomorrow, nothing about streaks", () => {
  const plan = planNotifications(mk(), NOW);
  assert.deepEqual(kinds(plan), ["nudge", "nudge"]);
  assert.equal(hhmm(plan[0].at), "17:00");
  assert.equal(plan[0].id, `nudge:${key(0)}`);
  assert.equal(plan[1].id, `nudge:${key(1)}`);
});

test("only future items, and master switch off plans nothing", () => {
  const late = new Date(2026, 10, 9, 18, 0);
  assert.equal(planNotifications(mk(), late).filter((p) => p.id === `nudge:${key(0)}`).length, 0);
  assert.deepEqual(planNotifications(withPrefs(mk(), { enabled: false }), NOW), []);
  assert.deepEqual(planNotifications(mk({ onboarded: false }), NOW), []);
});

test("risk and last call need a streak and an unfinished day", () => {
  const s = mk({}, [-1, -2]);
  const plan = today(planNotifications(s, NOW));
  assert.deepEqual(kinds(plan), ["nudge", "streakRisk", "lastCall"]);
  assert.equal(hhmm(plan[1].at), "20:00");
  assert.equal(hhmm(plan[2].at), "21:45");
  assert.match(plan[1].title, /2/);

  // streak of 1: risk yes, last call no
  assert.deepEqual(kinds(today(planNotifications(mk({}, [-1]), NOW))), ["nudge", "streakRisk"]);
  // no streak: neither
  assert.deepEqual(kinds(planNotifications(mk({}, [-3]), NOW)).filter((k) => k === "streakRisk" || k === "lastCall"), []);
  // phone time under the limit counts as on track
  const onTrack = mk({}, [-1, -2]);
  onTrack.days[key(0)].phoneMinutes = 20;
  assert.ok(!kinds(planNotifications(onTrack, NOW)).includes("streakRisk"));
});

test("done today: tomorrow still gets nudge and risk, today gets nothing", () => {
  const s = mk({}, [0, -1]);
  const plan = planNotifications(s, NOW);
  assert.deepEqual(today(plan), []);
  const tomorrow = plan.filter((p) => dayKey(new Date(p.at)) === key(1));
  assert.deepEqual(kinds(tomorrow), ["nudge", "streakRisk", "lastCall"]);
  assert.match(tomorrow[1].title + tomorrow[1].body, /2/);
});

test("not done today: tomorrow has no streak notifications (streak would be gone)", () => {
  const plan = planNotifications(mk({}, streak5), NOW);
  const tomorrow = plan.filter((p) => dayKey(new Date(p.at)) === key(1));
  assert.ok(tomorrow.length > 0 && tomorrow.every((p: any) => p.kind === "nudge" || p.kind === "comeback"));
});

test("quiet hours drop risk and last call, shift nudge to the end of quiet", () => {
  const s = withPrefs(mk({}, [-1, -2]), { quiet: { start: 19, end: 9 } });
  assert.deepEqual(kinds(today(planNotifications(s, NOW))), ["nudge"]);

  const shifted = withPrefs(mk(), { quiet: { start: 16, end: 9 } });
  const plan = planNotifications(shifted, NOW);
  const nudge = plan.find((p) => p.id === `nudge:${key(0)}`)!;
  assert.equal(hhmm(nudge.at), "09:00");
  assert.equal(dayKey(new Date(nudge.at)), key(1));
  assert.ok(plan.every((p) => !isQuiet(shifted.notif.prefs.quiet, p.at)));
  assert.equal(quietEnd({ start: 22, end: 8 }, new Date(2026, 10, 9, 7, 0).getTime()), new Date(2026, 10, 9, 8, 0).getTime());
  assert.equal(isQuiet({ start: 22, end: 8 }, new Date(2026, 10, 9, 23, 0).getTime()), true);
  assert.equal(isQuiet({ start: 22, end: 8 }, new Date(2026, 10, 9, 12, 0).getTime()), false);
  assert.equal(isQuiet(null, NOW.getTime()), false);
});

test("daily cap of 3 keeps the highest priority, tips go first", () => {
  const s = mk({ coins: 600 }, streak5);
  const plan = today(planNotifications(s, NOW));
  assert.deepEqual(kinds(plan), ["nudge", "streakRisk", "lastCall"]);
});

test("minimum gap: close ones are dropped by priority", () => {
  const s = withPrefs(mk({ coins: 300, freezes: 1 }, streak5), { reminderHour: 19 });
  const plan = today(planNotifications(s, NOW));
  assert.ok(!kinds(plan).includes("nudge"));
  assert.deepEqual(kinds(plan), ["shopTip", "streakRisk", "lastCall"]);
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i].at - plan[i - 1].at >= 90 * 60_000);
});

test("already sent ids are skipped and count against the cap", () => {
  const s = mk({}, [-1, -2]);
  s.notif.sent = [`nudge:${key(0)}`];
  assert.deepEqual(kinds(today(planNotifications(s, NOW))), ["streakRisk", "lastCall"]);

  const full = mk({}, [-1, -2]);
  const a = (id: string, kind: string, h: number) => ({ id, kind, title: "t", body: "b", at: new Date(2026, 10, 9, h).getTime(), action: "home", read: true, shown: true });
  full.notif.inbox = [a(`nudge:${key(0)}`, "nudge", 6), a(`x:${key(0)}`, "shopTip", 8), a(`y:${key(0)}`, "comeback", 9)];
  full.notif.sent = full.notif.inbox.map((i: any) => i.id);
  assert.deepEqual(today(planNotifications(full, NOW)), []);
});

test("comeback ladder replaces the nudge on step days only", () => {
  for (const [away, step] of [[2, true], [3, false], [4, true], [7, true], [14, true], [15, false]] as const) {
    const s = mk({}, [-away]);
    const first = planNotifications(s, NOW)[0];
    assert.equal(first.kind, step ? "comeback" : "nudge", `away ${away}`);
    if (step) assert.ok(first.body.length > 0 && !first.body.includes("{"));
  }
  const four = planNotifications(mk({}, [-4]), NOW)[0];
  assert.match(four.title, /ready/i);

  // never done a break: counted from the first day we know about
  const fresh = mk();
  fresh.days = { [key(-7)]: { breakMinutes: 0 }, [key(0)]: { breakMinutes: 0 } };
  assert.equal(planNotifications(fresh, NOW)[0].kind, "comeback");
  // tomorrow (day 5 after last break at -4) is a plain nudge
  const plan = planNotifications(mk({}, [-4]), NOW);
  assert.equal(plan.find((p) => p.id === `nudge:${key(1)}`)?.kind, "nudge");
});

test("freeze variant copy", () => {
  const without = today(planNotifications(mk({ freezes: 0 }, [-1, -2]), NOW));
  const withFreeze = today(planNotifications(mk({ freezes: 1 }, [-1, -2]), NOW));
  const risk0 = without.find((p) => p.kind === "streakRisk")!;
  const risk1 = withFreeze.find((p) => p.kind === "streakRisk")!;
  assert.doesNotMatch(risk0.title + risk0.body, /freeze/i);
  assert.match(risk1.title + risk1.body, /freeze/i);
  assert.match(withFreeze.find((p) => p.kind === "lastCall")!.body, /freeze/i);
  assert.doesNotMatch(without.find((p) => p.kind === "lastCall")!.body, /freeze/i);
});

test("freeze tip needs streak 5, no freezes and enough coins; otherwise shop tip", () => {
  const done5 = [0, ...streak5];
  const tip = (over: Over, days: number[]) => planNotifications(mk(over, days), NOW).find((p) => p.id.endsWith(key(0)) && p.kind.endsWith("Tip"))?.kind;
  assert.equal(tip({ coins: 300 }, done5), "freezeTip");
  assert.equal(tip({ coins: 300, freezes: 1 }, done5), "shopTip");
  assert.equal(tip({ coins: 200 }, done5), "shopTip");
  assert.equal(tip({ coins: 300 }, [0, -1, -2]), "shopTip");
  assert.equal(tip({ coins: 0 }, done5), undefined);
  assert.match(planNotifications(mk({ coins: 300 }, done5), NOW).find((p) => p.kind === "freezeTip")!.body, /250 coins/);
});

test("shop tip picks the priciest affordable unowned paid item", () => {
  const s = withPrefs(mk({ coins: 320 }), { reminderHour: 15 });
  const tip = planNotifications(s, NOW).find((p) => p.kind === "shopTip")!;
  assert.match(tip.body + tip.title, /Warm|Cool shades|Pirate|Round|Bunny|Sunny|Cat|Antennae|Party|Picnic|Snow|Big bow|Sunset|Sports|Eyepatch|Star|Bow tie|Monocle|Cozy|Little flower|[A-Z]/);
  assert.match(tip.body + tip.title, /320|300/);
  const owned = mk({ coins: 320, owned: ["outfit-flower", "outfit-shades", "bg-checker", "title-sunset"] });
  const tip2 = planNotifications(owned, NOW).find((p) => p.kind === "shopTip")!;
  assert.doesNotMatch(tip2.body + tip2.title, /Little flower|Cool shades|Picnic|Sunset Chaser/);
  assert.equal(planNotifications(mk({ coins: 10 }), NOW).find((p) => p.kind === "shopTip"), undefined);
});

test("a tip at most once in 4 days", () => {
  const tips = (s: any) => planNotifications(s, NOW).filter((p) => p.kind === "shopTip" || p.kind === "freezeTip").map((p) => p.id);
  assert.deepEqual(tips(mk({ coins: 300 })), [`shopTip:${key(0)}`]);
  const recent = mk({ coins: 300 });
  recent.notif.sent = [`shopTip:${key(-2)}`];
  assert.deepEqual(tips(recent), []);
  const older = mk({ coins: 300 });
  older.notif.sent = [`freezeTip:${key(-4)}`];
  assert.deepEqual(tips(older), [`shopTip:${key(0)}`]);
  const todayOnly = mk({ coins: 300 });
  todayOnly.notif.sent = [`shopTip:${key(0)}`];
  assert.deepEqual(tips(todayOnly), []);
  // horizon of 6 days: second tip only on day 4
  assert.deepEqual(planNotifications(mk({ coins: 300 }), NOW, 6).filter((p) => p.kind === "shopTip").map((p) => p.id), [`shopTip:${key(0)}`, `shopTip:${key(4)}`]);
});

test("a finished break alert ignores quiet hours, cap and categories only matter for breaks", () => {
  const s = withPrefs(mk({ coins: 600, activeBreak: { startedAt: NOW.getTime() - 5 * 60_000, minutes: 25 } }, streak5), { quiet: { start: 9, end: 12 } });
  const plan = planNotifications(s, NOW);
  const b = plan.find((p) => p.kind === "breakEnd")!;
  assert.equal(b.id, `breakEnd:${NOW.getTime() - 5 * 60_000}`);
  assert.equal(hhmm(b.at), "10:20");
  assert.match(b.body, /30 coins|25 minutes/);
  const off = { ...s, notif: { ...s.notif, prefs: { ...s.notif.prefs, categories: { ...s.notif.prefs.categories, breaks: false } } } };
  assert.ok(!kinds(planNotifications(off, NOW)).includes("breakEnd"));
  const sent = { ...s, notif: { ...s.notif, sent: [b.id] } };
  assert.ok(!kinds(planNotifications(sent, NOW)).includes("breakEnd"));
  const noQuiet = mk({ activeBreak: { startedAt: NOW.getTime() - 5 * 60_000, minutes: 25 } }, streak5);
  assert.equal(today(planNotifications(noQuiet, NOW)).filter((p) => p.kind !== "breakEnd").length, 3);
});

test("disabled categories", () => {
  const s = mk({ coins: 600 }, streak5);
  const off = (cat: string) => ({ ...s, notif: { ...s.notif, prefs: { ...s.notif.prefs, categories: { ...s.notif.prefs.categories, [cat]: false } } } });
  assert.deepEqual(kinds(today(planNotifications(off("streak"), NOW))), ["nudge", "freezeTip"]);
  assert.ok(!kinds(planNotifications(off("reminders"), NOW)).includes("nudge"));
  assert.ok(!kinds(planNotifications(off("shop"), NOW)).includes("freezeTip"));
});

test("events: milestone once, lost streak once, honours prefs", () => {
  const s = mk({}, [0, -1, -2, -3, -4, -5, -6]);
  const ev = detectEvents(s, NOW);
  assert.deepEqual(kinds(ev), ["milestone"]);
  assert.match(ev[0].title, /week/i);
  s.notif.sent = [ev[0].id];
  assert.deepEqual(detectEvents(s, NOW), []);
  assert.deepEqual(detectEvents(mk({}, [0, -1, -2, -3]), NOW), []);
  assert.deepEqual(detectEvents(withPrefs(mk({}, [0, -1, -2, -3, -4, -5, -6]), { enabled: false }), NOW), []);

  // streak 4 ended yesterday: lost today
  const lost = mk({}, [-2, -3, -4, -5]);
  const l = detectEvents(lost, NOW);
  assert.deepEqual(kinds(l), ["streakLost"]);
  assert.match(l[0].title, /4-day/);
  assert.match(l[0].body, /best is 4/);
  lost.notif.sent = [l[0].id];
  assert.deepEqual(detectEvents(lost, NOW), []);
});

test("eventNotif builds freezeUsed, limit and blocked app notifications", () => {
  const s = mk({}, [-1, -2]);
  const f = eventNotif(s, "freezeUsed", { streak: 9, daysWord: "a day", leftText: "You have 1 left." }, NOW);
  assert.equal(f.id, `freezeUsed:${key(0)}`);
  assert.match(f.body, /9-day/);
  assert.match(f.body, /1 left/);
  assert.match(eventNotif(s, "limit80", { used: 48, limit: 60, left: 12 }, NOW).body, /48 of 60|12/);
  assert.match(eventNotif(s, "blockedApp", { app: "Instagram" }, NOW, "123").title + "", /Instagram|awake/);
  assert.equal(eventNotif(s, "blockedApp", { app: "X" }, NOW, "123").id, "blockedApp:123");
});

test("copy: every kind fills every placeholder, rotates by day, no emoji", () => {
  const ctx = { name: "Sam", streak: 6, goal: 30, remaining: 20, minutes: 10, freezes: 0, coins: 400, days: 2, milestone: 7, best: 9, daysWord: "a day", leftText: "x", item: "Cat ears", price: 250, reward: 36, breakMinutes: 30, used: 48, limit: 60, left: 12, app: "TikTok" };
  const emoji = /\p{Extended_Pictographic}/u;
  for (const kind of COPY_KINDS as NotifKind[]) {
    for (const freezes of [0, 1]) for (const days of [2, 4, 7, 14]) for (const milestone of [3, 7, 14, 30, 50, 100]) {
      for (let seed = 0; seed < 8; seed++) {
        const { title, body } = writeCopy(kind, { ...ctx, freezes, days, milestone }, seed);
        assert.ok(title.length > 0 && body.length > 0, kind);
        assert.doesNotMatch(title + body, /[{}]|undefined|NaN/, `${kind}: ${title} / ${body}`);
        assert.doesNotMatch(title + body, emoji);
        assert.ok(title.length <= 40, `${kind} title too long: ${title}`);
        assert.ok(body.length <= 110, `${kind} body too long: ${body}`);
      }
    }
  }
  const a = writeCopy("nudge", ctx, 1).title;
  const rotated = new Set([0, 1, 2, 3, 4].map((i) => writeCopy("nudge", ctx, i).title));
  assert.ok(rotated.size > 1);
  assert.ok(variantCount("nudge", ctx) >= 4);
  assert.ok(a.length > 0);
});

test("state helpers: dedupe, trimming and migration", () => {
  const base = defaultNotifState();
  const n = { id: "nudge:1", kind: "nudge" as const, title: "t", body: "b", at: 1, action: "home" as const };
  const once = withDelivered(base, n, false);
  assert.equal(once.inbox.length, 1);
  assert.equal(withDelivered(once, n, true), once);
  let big = base;
  for (let i = 0; i < MAX_SENT + 50; i++) big = withDelivered(big, { ...n, id: `x:${i}` }, true);
  assert.equal(big.inbox.length, MAX_INBOX);
  assert.equal(big.sent.length, MAX_SENT);
  assert.equal(big.inbox[0].id, `x:${MAX_SENT + 49}`);

  assert.deepEqual(mergeNotifState(undefined), base);
  const merged = mergeNotifState({ prefs: { enabled: false, categories: { shop: false } } });
  assert.equal(merged.prefs.enabled, false);
  assert.equal(merged.prefs.categories.shop, false);
  assert.equal(merged.prefs.categories.streak, true);
  assert.deepEqual(merged.prefs.quiet, base.prefs.quiet);
  assert.equal(mergeNotifState({ prefs: { quiet: null } }).prefs.quiet, null);
});
