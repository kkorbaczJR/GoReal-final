import assert from "node:assert/strict";
import { test } from "node:test";
import { awayOutcome } from "./lib/breakLeave.ts";

const grace = 10;

test("a short look away never ends the break", () => {
  assert.equal(
    awayOutcome({ awaySeconds: 10, graceSeconds: grace, native: { known: true, left: true, screenOff: false }, cameBack: true, phoneBrowser: false }),
    "continue",
  );
});

test("turning the phone off keeps the break, on Android and in a phone browser", () => {
  assert.equal(
    awayOutcome({ awaySeconds: 60, graceSeconds: grace, native: { known: true, left: false, screenOff: true }, cameBack: true, phoneBrowser: false }),
    "continue",
  );
  assert.equal(
    awayOutcome({ awaySeconds: 60, graceSeconds: grace, native: { known: false, left: false, screenOff: true }, cameBack: true, phoneBrowser: false }),
    "continue",
  );
  assert.equal(
    awayOutcome({ awaySeconds: 60, graceSeconds: grace, native: null, cameBack: true, phoneBrowser: true }),
    "continue",
  );
});

test("another app in front ends the break in the Android app", () => {
  assert.equal(
    awayOutcome({ awaySeconds: 11, graceSeconds: grace, native: { known: true, left: true, screenOff: false }, cameBack: true, phoneBrowser: false }),
    "left",
  );
  assert.equal(
    awayOutcome({ awaySeconds: 11, graceSeconds: grace, native: { known: false, left: false, screenOff: false }, cameBack: true, phoneBrowser: false }),
    "left",
  );
});

test("opening the app again after the phone was off does not, by itself, end the break", () => {
  assert.equal(
    awayOutcome({ awaySeconds: 60, graceSeconds: grace, native: { known: false, left: false, screenOff: false }, cameBack: false, phoneBrowser: false }),
    "continue",
  );
  assert.equal(
    awayOutcome({ awaySeconds: 60, graceSeconds: grace, native: { known: true, left: true, screenOff: false }, cameBack: false, phoneBrowser: false }),
    "left",
  );
});

test("on a computer, leaving the tab ends the break", () => {
  assert.equal(
    awayOutcome({ awaySeconds: 11, graceSeconds: grace, native: null, cameBack: true, phoneBrowser: false }),
    "left",
  );
});

test("a phone browser ends the break when the screen stayed on, and keeps it when the screen locked", () => {
  assert.equal(
    awayOutcome({ awaySeconds: 30, graceSeconds: grace, native: null, cameBack: true, phoneBrowser: true, canSeeScreen: true, unlockedSeconds: 30 }),
    "left",
  );
  assert.equal(
    awayOutcome({ awaySeconds: 30, graceSeconds: grace, native: null, cameBack: true, phoneBrowser: true, canSeeScreen: true, unlockedSeconds: 0 }),
    "continue",
  );
  assert.equal(
    awayOutcome({ awaySeconds: 30, graceSeconds: grace, native: null, cameBack: true, phoneBrowser: true, canSeeScreen: true, unlockedSeconds: 10 }),
    "continue",
  );
});
