"use client";

/**
 * The small lock-screen card for a running break: Rilo and a countdown.
 * On Android the system draws the countdown, so it keeps going with the screen off.
 * On the website a notification shows the time to come back. Neither one keeps the screen awake.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { BASE_PATH } from "./base";
import { permission, registerServiceWorker } from "./notifications/delivery";

const TAG = "goreal-break-lock";

type BreakLockPlugin = {
  show(options: { endAt: number; title: string; subtitle: string; color: string }): Promise<void>;
  hide(): Promise<void>;
};

const Native = registerPlugin<BreakLockPlugin>("BreakLock");

export async function showBreakLock(options: { endAt: number; title: string; subtitle: string; color: string }) {
  if (typeof window === "undefined") return;
  if (Capacitor.getPlatform() === "android") {
    try {
      await Native.show(options);
    } catch {
      // The break still runs. The card is only a glance.
    }
    return;
  }
  if (permission() !== "granted") return;
  const back = new Date(options.endAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  try {
    const registration = await registerServiceWorker();
    const note = {
      body: `${options.subtitle} · ${back}`,
      tag: TAG,
      icon: `${BASE_PATH}/icons/icon-192.png`,
      silent: true,
    };
    if (registration) await registration.showNotification(options.title, note);
    else new Notification(options.title, note);
  } catch {
    // Same as above: the break does not depend on this.
  }
}

export async function hideBreakLock() {
  if (typeof window === "undefined") return;
  if (Capacitor.getPlatform() === "android") {
    try {
      await Native.hide();
    } catch {
      // Already gone.
    }
    return;
  }
  try {
    const registration = await registerServiceWorker();
    const notes = (await registration?.getNotifications({ tag: TAG })) ?? [];
    notes.forEach((note) => note.close());
  } catch {
    // Nothing to close.
  }
}
