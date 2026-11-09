"use client";

import { useEffect } from "react";
import { ACCENT_COLORS, DEFAULT_ACCENT, type Accent } from "@/lib/shop";
import { useGoReal } from "@/lib/store";

/** Sets the colour variables the whole app is drawn with. Pass `null` to go back to the default orange. */
export function applyAccent(accent: Accent | null) {
  const c = ACCENT_COLORS[accent ?? DEFAULT_ACCENT];
  const style = document.documentElement.style;
  style.setProperty("--accent", c.accent);
  style.setProperty("--accent-deep", c.deep);
  style.setProperty("--accent-soft", c.soft);
  style.setProperty("--on-accent", c.onAccent);
  style.setProperty("--accent-text", c.text);
  style.setProperty("--accent-blush", c.blush);
}

/**
 * The colour picked in the shop, applied to the whole app. The first paint is handled by `accentScript`
 * (see layout), this keeps it in step when the colour changes.
 */
export default function AccentTheme() {
  const accent = useGoReal()?.accent ?? null;
  useEffect(() => {
    if (accent) applyAccent(accent);
  }, [accent]);
  return null;
}

/** Runs before the first paint so a coloured app never flashes orange. Same palette as `applyAccent`. */
export const accentScript = `(function(){try{var P=${JSON.stringify(ACCENT_COLORS)};var s=JSON.parse(localStorage.getItem("goreal:v1")||"{}");var c=P[s.accent];if(!c||s.accent==="${DEFAULT_ACCENT}")return;var r=document.documentElement.style;r.setProperty("--accent",c.accent);r.setProperty("--accent-deep",c.deep);r.setProperty("--accent-soft",c.soft);r.setProperty("--on-accent",c.onAccent);r.setProperty("--accent-text",c.text);r.setProperty("--accent-blush",c.blush)}catch(e){}})()`;
