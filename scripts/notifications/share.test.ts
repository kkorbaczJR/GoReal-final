import assert from "node:assert/strict";
import { test } from "node:test";
import { APP_URL, SHARE_LINES, pickShareLine, streakLabel } from "./lib/shareCopy.ts";
import { shareDetails, streakMessage } from "./lib/shareStreak.ts";

test("the share link is the GitHub Pages app, and the captions name nobody", () => {
  assert.equal(APP_URL, "https://kkorbaczjr.github.io/GoReal-final/");
  assert.ok(SHARE_LINES.length >= 3);
  for (const line of SHARE_LINES) {
    assert.ok(line.length > 10);
    assert.equal(line.includes("🔥"), false);
    assert.equal(/\b(name|username|@)\b/i.test(line), false);
  }
});

test("a streak of 0 and of 1 still read as a streak", () => {
  assert.equal(streakLabel(0), "0-day streak");
  assert.equal(streakLabel(1), "1-day streak");
  assert.equal(streakLabel(12), "12-day streak");
  assert.equal(streakLabel(1.9), "1-day streak");
});

test("the caption picker stays inside the list", () => {
  assert.equal(pickShareLine(() => 0), SHARE_LINES[0]);
  assert.equal(pickShareLine(() => 0.999), SHARE_LINES[SHARE_LINES.length - 1]);
});

test("the share card repeats the streak screen, and names nobody", () => {
  assert.equal(streakMessage(1, true, false, false), "Today already counts. See you tomorrow!");
  assert.equal(streakMessage(1, true, false, true), "Day one. Every streak starts here.");
  assert.equal(streakMessage(4, true, false, true), "You're on a roll. Take a break tomorrow to keep it going.");
  const card = shareDetails({ days: {}, phoneLimit: 120, breakGoal: 15, freezes: 0 }, false, new Date(2026, 10, 11));
  assert.equal(card.count, 0);
  assert.equal(card.week.length, 7);
  assert.equal(card.week[6]?.today, true);
  assert.equal(card.week.filter((day) => day.today).length, 1);
  assert.equal(card.bestLabel, "0 days");
  assert.equal(card.limitLabel, "15m / 2h");
  assert.equal(card.freezeLabel, "0 of 2");
  assert.equal(/\b(name|username|@)\b/i.test(card.line), false);
});
