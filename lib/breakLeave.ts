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
  /** A phone's browser, not the Android app. */
  phoneBrowser: boolean;
  /**
   * Seconds the screen stayed on while GoReal was hidden.
   * 0 when the screen was locked, or when this browser cannot see the lock.
   */
  unlockedSeconds?: number;
  /** This browser can tell a locked screen from one that stayed on. */
  canSeeScreen?: boolean;
}): "continue" | "left" {
  if (input.awaySeconds <= input.graceSeconds) return "continue";
  if (input.native) {
    if (input.native.known) return input.native.left ? "left" : "continue";
    // No usage access: a screen that turned off is a lock. A screen that stayed on is another app.
    if (!input.cameBack) return "continue";
    return input.native.screenOff ? "continue" : "left";
  }
  if (!input.cameBack) return "continue";
  if (input.phoneBrowser) {
    // Without a screen-lock signal, locking and switching apps look the same. Keep the break,
    // so turning the phone off still works. With the signal, only time the screen stayed on counts.
    if (!input.canSeeScreen) return "continue";
    return (input.unlockedSeconds ?? 0) > input.graceSeconds ? "left" : "continue";
  }
  return "left";
}

/** Phones and tablets. A desktop browser has a fine pointer, and leaving its tab still ends a break. */
export function isPhoneBrowser(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}
