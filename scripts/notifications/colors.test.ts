import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACCENT_COLORS,
  ACCENT_PRICE,
  DEFAULT_ACCENT,
  SHOP_ITEMS,
  isAccent,
  isOwned,
  itemById,
  type Accent,
} from "./lib/shop.ts";

const RAINBOW: Accent[] = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
const colorItems = SHOP_ITEMS.filter((i) => i.kind === "color");

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("the seven rainbow colours, in order, each with a shop item", () => {
  assert.deepEqual(Object.keys(ACCENT_COLORS), RAINBOW);
  assert.deepEqual(colorItems.map((i) => (i.kind === "color" ? i.look : null)), RAINBOW);
  assert.equal(new Set(colorItems.map((i) => i.id)).size, RAINBOW.length);
});

test("every colour costs 100 coins, except the orange you start with", () => {
  for (const item of colorItems) {
    assert.equal(item.price, item.kind === "color" && item.look === DEFAULT_ACCENT ? 0 : ACCENT_PRICE, item.id);
  }
  assert.equal(ACCENT_PRICE, 100);
});

test("orange is owned from the start, the rest only once bought", () => {
  for (const item of colorItems) {
    const free = item.kind === "color" && item.look === DEFAULT_ACCENT;
    assert.equal(isOwned(item, [], 0), free, item.id);
    assert.equal(isOwned(item, [item.id], 0), true);
  }
  assert.equal(itemById("color-red")?.kind, "color");
});

test("the default is the original orange, so nothing changes for existing users", () => {
  assert.equal(DEFAULT_ACCENT, "orange");
  assert.deepEqual(ACCENT_COLORS.orange, {
    accent: "#fc4c02",
    deep: "#e03e00",
    soft: "#fff0e8",
    onAccent: "#ffffff",
    text: "#fc4c02",
    blush: "#ffb08a",
  });
});

test("Rilo's blush is his colour, lighter: between the accent and white on every channel", () => {
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (const [name, c] of Object.entries(ACCENT_COLORS)) {
    const accent = rgb(c.accent);
    const blush = rgb(c.blush);
    blush.forEach((v, i) => assert.ok(v >= accent[i] && v <= 255, `${name}: channel ${i} is ${v}`));
    assert.ok(luminance(c.blush) > luminance(c.accent), `${name}: blush is not lighter`);
  }
});

test("text on a button is readable on every colour, and accent text on white is readable too", () => {
  for (const [name, c] of Object.entries(ACCENT_COLORS)) {
    assert.ok(contrast(c.onAccent, c.accent) >= 3, `${name}: text on the accent is ${contrast(c.onAccent, c.accent).toFixed(2)}`);
    assert.ok(contrast(c.text, "#ffffff") >= 3, `${name}: text on white is ${contrast(c.text, "#ffffff").toFixed(2)}`);
    assert.ok(contrast(c.deep, "#ffffff") >= 3, `${name}: deep on white is ${contrast(c.deep, "#ffffff").toFixed(2)}`);
    assert.ok(contrast(c.deep, c.soft) >= 3, `${name}: deep on soft is ${contrast(c.deep, c.soft).toFixed(2)}`);
    for (const hex of Object.values(c)) assert.match(hex, /^#[0-9a-f]{6}$/);
  }
});

test("the colours are clearly different from each other", () => {
  const seen = Object.values(ACCENT_COLORS).map((c) => c.accent);
  assert.equal(new Set(seen).size, seen.length);
});

test("isAccent only accepts the seven names", () => {
  for (const name of RAINBOW) assert.equal(isAccent(name), true);
  for (const bad of ["pink", "", null, undefined, 3, "toString", "__proto__"]) assert.equal(isAccent(bad), false);
});

test("new hats, the neck bandana and back items are in the shop", () => {
  const id = (n: string) => itemById(n);
  for (const [n, kind] of [
    ["hat-flower-crown", "hat"],
    ["hat-santa", "hat"],
    ["hat-headband", "hat"],
    ["hat-bucket", "hat"],
    ["hat-gasmask", "hat"],
    ["hat-astronaut", "hat"],
    ["neck-bandana", "neck"],
    ["back-angel", "back"],
    ["back-demon", "back"],
    ["back-backpack", "back"],
    ["back-jetpack", "back"],
    ["back-sword", "back"],
  ] as const) {
    assert.equal(id(n)?.kind, kind, n);
  }
  assert.equal(SHOP_ITEMS.filter((i) => i.kind === "hat").length, 26);
  assert.equal(SHOP_ITEMS.filter((i) => i.kind === "back").length, 5);
});
