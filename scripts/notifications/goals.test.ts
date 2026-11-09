import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, dayKey } from "./lib/date.ts";
import { changeGoals, goalsFor, goalsWaitForTomorrow, type DayLog } from "./lib/rules.ts";

const NOW = new Date(2026, 10, 9, 15, 0);
const today = dayKey(NOW);
const yesterday = dayKey(addDays(NOW, -1));
const OLD = { phoneLimit: 60, breakGoal: 30 };

const withToday = (log: Partial<DayLog> = {}): Record<string, DayLog> => ({
  [yesterday]: { breakMinutes: 30, goal: OLD },
  [today]: { breakMinutes: 0, goal: OLD, ...log },
});

test("an untouched day follows any change, easier or stricter", () => {
  const easier = changeGoals(withToday(), OLD, { breakGoal: 15, phoneLimit: 120 }, NOW);
  assert.deepEqual(easier[today].goal, { phoneLimit: 120, breakGoal: 15 });
  const stricter = changeGoals(withToday(), OLD, { breakGoal: 60, phoneLimit: 30 }, NOW);
  assert.deepEqual(stricter[today].goal, { phoneLimit: 30, breakGoal: 60 });
});

test("past days never change", () => {
  const next = changeGoals(withToday(), OLD, { breakGoal: 15 }, NOW);
  assert.deepEqual(next[yesterday].goal, OLD);
});

test("a day without a saved goal is stamped with the old goals first, then follows an untouched change", () => {
  const next = changeGoals({}, OLD, { breakGoal: 15 }, NOW);
  assert.deepEqual(next[today].goal, { phoneLimit: 60, breakGoal: 15 });
});

test("after a break, an easier goal waits until tomorrow", () => {
  const days = withToday({ breakMinutes: 15 });
  const next = changeGoals(days, OLD, { breakGoal: 15 }, NOW);
  assert.deepEqual(goalsFor(next[today], OLD), OLD);
  assert.equal(goalsWaitForTomorrow(next, { phoneLimit: 60, breakGoal: 15 }, NOW), true);
});

test("after a break, a stricter goal applies while today does not count yet", () => {
  const days = withToday({ breakMinutes: 15 });
  const next = changeGoals(days, OLD, { breakGoal: 60 }, NOW);
  assert.equal(next[today].goal?.breakGoal, 60);
  assert.equal(goalsWaitForTomorrow(next, { phoneLimit: 60, breakGoal: 60 }, NOW), false);
});

test("once today counts, nothing can make it harder or easier", () => {
  const days = withToday({ breakMinutes: 30 });
  assert.deepEqual(changeGoals(days, OLD, { breakGoal: 60 }, NOW)[today].goal, OLD);
  assert.deepEqual(changeGoals(days, OLD, { breakGoal: 15 }, NOW)[today].goal, OLD);
});

test("logged phone time counts as progress: an easier limit waits, a lower one applies", () => {
  const days = withToday({ phoneMinutes: 50 });
  assert.equal(changeGoals(days, OLD, { phoneLimit: 120 }, NOW)[today].goal?.phoneLimit, 60);
  assert.equal(changeGoals(days, OLD, { phoneLimit: 30 }, NOW)[today].goal?.phoneLimit, 30);
});

test("each goal is judged on its own", () => {
  const days = withToday({ breakMinutes: 10 });
  const next = changeGoals(days, OLD, { breakGoal: 15, phoneLimit: 30 }, NOW);
  assert.deepEqual(next[today].goal, { phoneLimit: 30, breakGoal: 30 });
});

test("nothing changes when the same goals are picked again, and the same object comes back", () => {
  const days = withToday();
  assert.equal(changeGoals(days, OLD, { breakGoal: 30 }, NOW), days);
});
