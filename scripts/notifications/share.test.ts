import assert from "node:assert/strict";
import { test } from "node:test";
import { APP_URL, SHARE_LINES, pickShareLine, streakLabel } from "./lib/shareCopy.ts";

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
