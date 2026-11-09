/**
 * How a notification actually reaches the user's screen outside the app. This is the only part of the
 * notification system that touches the platform, so it is the only part that changes for the phone app.
 *
 * The shape every delivery adapter has (web today, Expo later):
 *
 *   permission()            -> "granted" | "denied" | "default" | "unsupported"
 *   requestPermission()     -> asks the user, returns the new permission
 *   showSystem(n)           -> show one notification right now, true if it was shown
 *
 * Mapping to expo-notifications:
 *   permission()        = Notifications.getPermissionsAsync()          (status granted/denied/undetermined)
 *   requestPermission() = Notifications.requestPermissionsAsync()
 *   showSystem(n)       = Notifications.scheduleNotificationAsync({
 *                           content: { title: n.title, body: n.body, data: { id: n.id, action: n.action } },
 *                           identifier: n.id,
 *                           trigger: null })                           (null = right now)
 * and, because a phone can deliver while the app is closed, the Expo adapter adds
 *   syncSchedule(plan)  = cancelAllScheduledNotificationsAsync(), then for every item in
 *                         planNotifications(state, now): scheduleNotificationAsync({ ..., trigger: { date: n.at } })
 * On the web nothing can fire while the app is closed (no push server yet), so the web adapter has no schedule.
 * Taps map to Notifications.addNotificationResponseReceivedListener, reading `data.action`.
 */
import type { Notif } from "./types";

export type NotifPermission = "granted" | "denied" | "default" | "unsupported";

export function permission(): NotifPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestPermission(): Promise<NotifPermission> {
  if (permission() === "unsupported") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return permission();
  }
}

/** Registers the worker and waits until it is active. Null when the browser has no service workers. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js");
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/** Shows a system notification right now. Uses the service worker when there is one (needed on Android). */
export async function showSystem(n: Notif): Promise<boolean> {
  if (permission() !== "granted") return false;
  const options: NotificationOptions = {
    body: n.body,
    tag: n.id,
    icon: "/apple-icon",
    badge: "/apple-icon",
    data: { id: n.id, action: n.action },
  };
  try {
    const registration = await registerServiceWorker();
    if (registration) {
      await registration.showNotification(n.title, options);
      return true;
    }
    new Notification(n.title, options);
    return true;
  } catch {
    return false;
  }
}
