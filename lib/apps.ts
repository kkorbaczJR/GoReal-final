/**
 * The apps you can put off limits in onboarding, and how Android knows them. An app can ship under more than
 * one package (a Lite version, a regional build), so each name maps to a list. "Games" is not one app: on
 * Android it means every installed app that says it is a game.
 */
export const GAMES = "Games";

export const APP_PACKAGES: Record<string, string[]> = {
  TikTok: ["com.zhiliaoapp.musically", "com.ss.android.ugc.trill", "com.zhiliaoapp.musically.go"],
  Instagram: ["com.instagram.android", "com.instagram.lite"],
  YouTube: ["com.google.android.youtube", "com.google.android.apps.youtube.kids"],
  Snapchat: ["com.snapchat.android"],
  Discord: ["com.discord"],
  Roblox: ["com.roblox.client"],
  WhatsApp: ["com.whatsapp", "com.whatsapp.w4b"],
  X: ["com.twitter.android"],
  Twitch: ["tv.twitch.android.app"],
  Reddit: ["com.reddit.frontpage"],
  Netflix: ["com.netflix.mediaclient"],
  [GAMES]: [],
};

export const APP_CHOICES = Object.keys(APP_PACKAGES);

/** Package name to app name, for the apps picked. What the Android tracker is asked to watch. */
export function packagesFor(apps: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const app of apps) for (const pkg of APP_PACKAGES[app] ?? []) out[pkg] = app;
  return out;
}
