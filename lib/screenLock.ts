"use client";

/**
 * On a phone's browser, locking the screen and opening another app both hide the page.
 * Chrome can tell those apart once it is allowed to see whether the screen is locked.
 * The Android app does not use this. It reads usage access instead.
 */

type Screen = "locked" | "unlocked" | "unknown";

type Detector = {
  screenState: Screen | null;
  addEventListener(type: "change", listener: () => void): void;
  start(options: { threshold: number; signal?: AbortSignal }): Promise<void>;
};

type DetectorCtor = {
  new (): Detector;
  requestPermission(): Promise<PermissionState>;
};

let screen: Screen = "unknown";
let watching = false;
let asking = false;
let starting = false;
/** When the screen was on while the page was hidden. 0 while it is locked or the page is visible. */
let unlockedSince = 0;
let stopDetector: (() => void) | null = null;
const listeners = new Set<() => void>();

function ctor(): DetectorCtor | null {
  if (typeof window === "undefined") return null;
  const found = (window as unknown as { IdleDetector?: DetectorCtor }).IdleDetector;
  return found ?? null;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function apply(next: Screen) {
  if (next !== "locked" && next !== "unlocked") return;
  screen = next;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    unlockedSince = next === "locked" ? 0 : unlockedSince || Date.now();
  }
}

async function listen(Idle: DetectorCtor) {
  const detector = new Idle();
  const ac = new AbortController();
  stopDetector = () => ac.abort();
  detector.addEventListener("change", () => {
    if (detector.screenState) apply(detector.screenState);
  });
  await detector.start({ threshold: 60_000, signal: ac.signal });
  if (detector.screenState) apply(detector.screenState);
  watching = true;
  emit();
}

/**
 * Ask, during the tap that starts a break, whether this browser can see a locked screen.
 * Safe to call again. A browser without the API leaves the break as it was.
 */
export function armScreenLock() {
  const Idle = ctor();
  if (!Idle || watching || asking || starting) return;
  asking = true;
  void Idle.requestPermission()
    .then((perm) => {
      asking = false;
      if (perm !== "granted" || watching) return;
      starting = true;
      return listen(Idle).finally(() => {
        starting = false;
      });
    })
    .catch(() => {
      asking = false;
      starting = false;
    });
}

export function isWatchingScreen(): boolean {
  return watching;
}

export function subscribeScreen(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Call when the page has just been hidden. */
export function noteScreenHidden() {
  unlockedSince = screen === "locked" ? 0 : Date.now();
}

/** How long the screen stayed on during this hide. A lock brings it back to 0. */
export function unlockedHiddenSeconds(): number {
  if (!unlockedSince) return 0;
  return (Date.now() - unlockedSince) / 1000;
}

export function stopScreenLock() {
  stopDetector?.();
  stopDetector = null;
  watching = false;
  asking = false;
  starting = false;
  screen = "unknown";
  unlockedSince = 0;
  emit();
}
