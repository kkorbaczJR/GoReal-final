"use client";

/**
 * Measured phone time in the Android app. Talks to the PhoneUsage plugin (android/.../PhoneUsagePlugin.java),
 * which reads Android's usage access, and keeps the latest reading for the screens. On the web nothing here
 * runs: a browser cannot see other apps, so phone time is logged by hand there.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { useSyncExternalStore } from "react";
import { APP_PACKAGES, GAMES, packagesFor } from "./apps";
import { LEAVE_GRACE_SECONDS } from "./rules";
import { dailyMinutes, usageSnapshot, type UsageInterval, type UsageSnapshot } from "./usage";
import type { BreakLook } from "./breakLeave";

type PhoneUsagePlugin = {
  status(): Promise<{ granted: boolean }>;
  openSettings(): Promise<void>;
  installed(options: { packages: string[] }): Promise<{ packages: string[] }>;
  intervals(options: {
    from: number;
    to: number;
    packages: Record<string, string>;
    gamesLabel?: string;
  }): Promise<{ intervals: UsageInterval[] }>;
  /** Whether another app was in front for longer than the grace period since `since`. */
  leftBreak(options: { since: number; graceMs: number }): Promise<BreakLook>;
};

const PhoneUsage = registerPlugin<PhoneUsagePlugin>("PhoneUsage");

/** Usage is read from a little before the first day, so an app already open at midnight is caught. */
const LOOKBACK_MS = 3 * 60 * 60_000;
const TIMEOUT_MS = 4_000;

/** Can GoReal measure phone time here? Only in the Android app. */
export function canMeasure(): boolean {
  return typeof window !== "undefined" && Capacitor.getPlatform() === "android";
}

export type Access = "unknown" | "granted" | "off";

export type PhoneReading = {
  at: number;
  intervals: UsageInterval[];
  snapshot: UsageSnapshot;
  /** Minutes per day, from the first day asked for up to today. */
  totals: Record<string, number>;
};

type Live = { access: Access; reading: PhoneReading | null };

let live: Live = { access: "unknown", reading: null };
const listeners = new Set<() => void>();

function set(patch: Partial<Live>) {
  live = { ...live, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER: Live = { access: "unknown", reading: null };

/** Whether usage access is on, and the latest reading. */
export function usePhone(): Live {
  return useSyncExternalStore(subscribe, () => live, () => SERVER);
}

export function getPhone(): Live {
  return live;
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("PhoneUsage timed out")), TIMEOUT_MS)),
  ]);
}

/**
 * Reads how long the picked apps were open, from the start of the day of `from` until now.
 * Returns null when usage access is off (or the phone did not answer).
 */
export async function readPhone(apps: string[], from: number): Promise<PhoneReading | null> {
  if (!canMeasure()) return null;
  try {
    const { granted } = await withTimeout(PhoneUsage.status());
    if (!granted) {
      set({ access: "off", reading: null });
      return null;
    }
    const now = Date.now();
    const { intervals } = await withTimeout(
      PhoneUsage.intervals({
        from: from - LOOKBACK_MS,
        to: now,
        packages: packagesFor(apps),
        gamesLabel: apps.includes(GAMES) ? GAMES : undefined,
      }),
    );
    const reading = { at: now, intervals, snapshot: usageSnapshot(intervals, now), totals: dailyMinutes(intervals, from, now) };
    set({ access: "granted", reading });
    return reading;
  } catch {
    return null;
  }
}

/**
 * Android only. `known` is false when usage access is off: then `screenOff` says the screen turned off
 * since `since` (a lock), which is not the same as opening another app.
 */
export async function leftDuringBreak(since: number): Promise<BreakLook> {
  if (!canMeasure()) return { known: false, left: false, screenOff: false };
  try {
    return await withTimeout(PhoneUsage.leftBreak({ since, graceMs: LEAVE_GRACE_SECONDS * 1000 }));
  } catch {
    return { known: false, left: false, screenOff: false };
  }
}

/** Opens Android's "Usage access" settings, where GoReal's switch is. */
export function openUsageSettings() {
  void PhoneUsage.openSettings();
}

/** Which picked apps are on this phone. Games always count as there. */
export async function installedApps(apps: string[]): Promise<Set<string>> {
  const out = new Set<string>(apps.filter((a) => a === GAMES));
  try {
    const { packages } = await withTimeout(PhoneUsage.installed({ packages: apps.flatMap((a) => APP_PACKAGES[a] ?? []) }));
    for (const app of apps) if ((APP_PACKAGES[app] ?? []).some((p) => packages.includes(p))) out.add(app);
  } catch {
    // Unknown: show nothing as missing.
    apps.forEach((a) => out.add(a));
  }
  return out;
}
