import assert from "node:assert/strict";
import { test } from "node:test";
import { DEVICE_FIELDS, authErrorText, forCloud, fromCloud, syncStep, type SyncMeta } from "./lib/sync-rules.ts";

const meta = (over: Partial<SyncMeta> = {}): SyncMeta => ({ uid: "me", syncedRev: 100, changedAt: null, ...over });

test("a new account takes this phone's progress", () => {
  assert.equal(syncStep(null, "me", null), "push");
  assert.equal(syncStep(meta({ uid: "someone-else" }), "me", null), "push");
});

test("logging in to an account that has progress replaces this phone's, even if this phone has some", () => {
  assert.equal(syncStep(null, "me", { rev: 50 }), "pull");
  assert.equal(syncStep(meta({ uid: "someone-else", changedAt: 999 }), "me", { rev: 50 }), "pull");
});

test("nothing changed anywhere: nothing to do", () => {
  assert.equal(syncStep(meta(), "me", { rev: 100 }), "none");
});

test("only this phone changed: upload", () => {
  assert.equal(syncStep(meta({ changedAt: 150 }), "me", { rev: 100 }), "push");
});

test("only another device changed: download", () => {
  assert.equal(syncStep(meta(), "me", { rev: 200 }), "pull");
});

test("both changed: the later change wins", () => {
  assert.equal(syncStep(meta({ changedAt: 300 }), "me", { rev: 200 }), "push");
  assert.equal(syncStep(meta({ changedAt: 150 }), "me", { rev: 200 }), "pull");
});

test("the cloud copy was deleted (account reset elsewhere): upload again", () => {
  assert.equal(syncStep(meta(), "me", null), "push");
});

test("a running break, one-off messages and phone measuring stay on this phone", () => {
  const local = { coins: 5, activeBreak: { startedAt: 1, minutes: 15 }, notice: "left-during-break", phoneTracking: true };
  const up = forCloud(local);
  for (const f of DEVICE_FIELDS) assert.equal(f in up, false, f);
  assert.equal(up.coins, 5);

  const cloud = { coins: 900, activeBreak: { startedAt: 2, minutes: 60 }, notice: null, phoneTracking: false };
  const down = fromCloud(cloud, local);
  assert.equal(down.coins, 900);
  assert.deepEqual(down.activeBreak, local.activeBreak);
  assert.equal(down.notice, local.notice);
  assert.equal(down.phoneTracking, true);
});

test("sign-in errors read like a person wrote them, and a closed popup says nothing", () => {
  assert.equal(authErrorText("auth/invalid-credential"), "Wrong email or password.");
  assert.match(authErrorText("auth/email-already-in-use"), /Log in instead/);
  assert.match(authErrorText("auth/weak-password"), /8 characters/);
  assert.equal(authErrorText("auth/popup-closed-by-user"), "");
  assert.equal(authErrorText("auth/something-new"), "Something went wrong. Try again.");
});
