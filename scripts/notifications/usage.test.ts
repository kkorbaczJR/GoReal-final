import assert from "node:assert/strict";
import { test } from "node:test";
import { APP_CHOICES, APP_PACKAGES, GAMES, packagesFor } from "./lib/apps.ts";
import { dailyMinutes, minutesByApp, usageSnapshot, withPhoneMinutes } from "./lib/usage.ts";

const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime(); // November 2026
const MIN = 60_000;
const use = (app: string, start: number, minutes: number) => ({ app, start, end: start + minutes * MIN });

test("every onboarding choice except Games maps to at least one package, and no package to two apps", () => {
  for (const app of APP_CHOICES) {
    if (app === GAMES) assert.deepEqual(APP_PACKAGES[app], []);
    else assert.ok(APP_PACKAGES[app].length > 0, app);
  }
  const all = Object.values(APP_PACKAGES).flat();
  assert.equal(new Set(all).size, all.length);
});

test("only the picked apps are watched", () => {
  const watched = packagesFor(["TikTok", "Games"]);
  assert.equal(watched["com.zhiliaoapp.musically"], "TikTok");
  assert.equal(watched["com.instagram.android"], undefined);
  assert.ok(Object.values(watched).every((app) => app === "TikTok"));
});

test("daily totals split at midnight and count overlapping apps once", () => {
  const list = [
    use("TikTok", at(8, 23, 40), 40), // 20 min on the 8th, 20 on the 9th
    use("TikTok", at(9, 12, 0), 30),
    use("Instagram", at(9, 12, 20), 20), // 10 min overlap with TikTok (split screen or a slow switch)
  ];
  assert.deepEqual(dailyMinutes(list, at(8, 0), at(9, 15)), { "2026-11-08": 20, "2026-11-09": 60 });
});

test("minutes are rounded, so 2 min 59 s of TikTok shows as 3 min", () => {
  const list = [{ app: "TikTok", start: at(9, 14), end: at(9, 14) + 179_900 }, { app: "Games", start: at(9, 14, 10), end: at(9, 14, 10) + 59_700 }];
  assert.deepEqual(minutesByApp(list, at(9, 0), at(9, 15)), [{ app: "TikTok", minutes: 3 }, { app: "Games", minutes: 1 }]);
  assert.equal(dailyMinutes(list, at(9, 0), at(9, 15))["2026-11-09"], 4);
});

test("a day with no use is 0, and today stops at now", () => {
  const list = [use("TikTok", at(9, 14, 50), 30)];
  assert.deepEqual(dailyMinutes(list, at(7, 10), at(9, 15)), { "2026-11-07": 0, "2026-11-08": 0, "2026-11-09": 10 });
});

test("per-app minutes, most used first", () => {
  const list = [use("Instagram", at(9, 9), 12), use("TikTok", at(9, 10), 30), use("TikTok", at(9, 11), 5), use("X", at(9, 12), 0.4)];
  assert.deepEqual(minutesByApp(list, at(9, 0), at(9, 15)), [
    { app: "TikTok", minutes: 35 },
    { app: "Instagram", minutes: 12 },
  ]);
});

test("switching between counted apps keeps one session going", () => {
  const list = [use("TikTok", at(9, 14, 0), 20), use("Instagram", at(9, 14, 21), 25), use("TikTok", at(9, 14, 47), 12)];
  const snap = usageSnapshot(list, at(9, 15));
  assert.equal(snap.todayMinutes, 57);
  assert.deepEqual(snap.session, { startedAt: at(9, 14, 0), minutes: 59 });
});

test("measured minutes fill the history from the first day on, and leave break minutes alone", () => {
  const days = { "2026-11-09": { breakMinutes: 15, goal: { phoneLimit: 60, breakGoal: 30 } } };
  const next = withPhoneMinutes(days, { "2026-11-07": 30, "2026-11-08": 45, "2026-11-09": 20 }, "2026-11-08", "2026-11-09");
  assert.deepEqual(next, {
    "2026-11-08": { breakMinutes: 0, phoneMinutes: 45 },
    "2026-11-09": { breakMinutes: 15, goal: { phoneLimit: 60, breakGoal: 30 }, phoneMinutes: 20 },
  });
  assert.equal(withPhoneMinutes(next, { "2026-11-09": 20 }, "2026-11-08", "2026-11-09"), next);
});

test("a finished day never drops (Android forgot it), but today follows the measurement", () => {
  const days = { "2026-11-08": { breakMinutes: 0, phoneMinutes: 95 }, "2026-11-09": { breakMinutes: 0, phoneMinutes: 30 } };
  const next = withPhoneMinutes(days, { "2026-11-08": 0, "2026-11-09": 25 }, "2026-11-01", "2026-11-09");
  assert.equal(next["2026-11-08"].phoneMinutes, 95);
  assert.equal(next["2026-11-09"].phoneMinutes, 25);
  assert.equal(withPhoneMinutes(days, { "2026-11-08": 120 }, "2026-11-01", "2026-11-09")["2026-11-08"].phoneMinutes, 120);
});
