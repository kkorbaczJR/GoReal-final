/**
 * Deciding whether coming back to a break means it still counts.
 * Turning the phone off must not end a break. Opening another app still does, where the phone can tell.
 */

export type BreakLook = { known: boolean; left: boolean; screenOff: boolean };

export function awayOutcome(input: {
  awaySeconds: number;
  graceSeconds: number;
  /** Android's answer. Null on the web, or when the phone could not be asked. */
  native: BreakLook | null;
  /** The page was hidden and came back. False when GoReal is opening from scratch. */
  cameBack: boolean;
  /** A phone's browser cannot tell locking the phone from opening another app. */
  phoneBrowser: boolean;
}): "continue" | "left" {
  if (input.awaySeconds <= input.graceSeconds) return "continue";
  if (input.native) {
    if (input.native.known) return input.native.left ? "left" : "continue";
    // No usage access: a screen that turned off is a lock. A screen that stayed on is another app.
    if (!input.cameBack) return "continue";
    return input.native.screenOff ? "continue" : "left";
  }
  if (input.phoneBrowser || !input.cameBack) return "continue";
  return "left";
}

/** Phones and tablets. A desktop browser has a fine pointer, and leaving its tab still ends a break. */
export function isPhoneBrowser(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}
