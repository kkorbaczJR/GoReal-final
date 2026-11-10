"use client";

import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * "Install GoReal": putting the website on the home screen so it opens like an app.
 * - installed: already opened from the home screen (or the Android app).
 * - prompt: the browser can install it with one tap (Chrome and Edge on Android and computers).
 * - ios: Safari and the other iPhone browsers, where you add it yourself from the Share menu.
 * - inApp: opened inside Instagram, TikTok and similar apps, which cannot install. Open it in the browser first.
 * - android: an Android browser that did not offer the one-tap install (yet). Use its menu.
 * - none: a computer without a one-tap install; nothing to show.
 */
export type InstallWay = "installed" | "prompt" | "ios" | "inApp" | "android" | "none";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

declare global {
  interface Window {
    __gorealInstall?: PromptEvent | null;
    __gorealInstalled?: boolean;
  }
}

const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|musical_ly|BytedanceWebview|TikTok|Snapchat|LinkedInApp|Twitter|Line\/|GSA\//;

function standalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function detect(): InstallWay {
  if (Capacitor.isNativePlatform() || window.__gorealInstalled || standalone()) return "installed";
  if (window.__gorealInstall) return "prompt";
  const ua = navigator.userAgent;
  const android = /Android/.test(ua);
  if (!isIos() && !android) return "none";
  if (IN_APP.test(ua) || (android && /; wv\)/.test(ua))) return "inApp";
  return isIos() ? "ios" : "android";
}

function subscribe(onChange: () => void) {
  const display = window.matchMedia("(display-mode: standalone)");
  window.addEventListener("goreal:install", onChange);
  display.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("goreal:install", onChange);
    display.removeEventListener("change", onChange);
  };
}

/** How this phone can install GoReal. "none" before the page has loaded. */
export function useInstallWay(): InstallWay {
  return useSyncExternalStore(subscribe, detect, () => "none");
}

/** Shows the browser's own install question. Returns true if the person said yes. */
export async function promptInstall(): Promise<boolean> {
  const offer = window.__gorealInstall;
  if (!offer) return false;
  window.__gorealInstall = null;
  await offer.prompt();
  const { outcome } = await offer.userChoice;
  if (outcome === "accepted") window.__gorealInstalled = true;
  window.dispatchEvent(new Event("goreal:install"));
  return outcome === "accepted";
}

const CARD_KEY = "goreal:install-card";

function readCardHidden(): boolean {
  try {
    return localStorage.getItem(CARD_KEY) === "hidden";
  } catch {
    return false;
  }
}

function subscribeCard(onChange: () => void) {
  window.addEventListener("goreal:install-card", onChange);
  return () => window.removeEventListener("goreal:install-card", onChange);
}

/** Whether the "Get the app" card on Today was closed. The Install row in Profile stays. */
export function useInstallCardHidden(): boolean {
  return useSyncExternalStore(subscribeCard, readCardHidden, () => true);
}

export function hideInstallCard() {
  try {
    localStorage.setItem(CARD_KEY, "hidden");
  } catch {}
  window.dispatchEvent(new Event("goreal:install-card"));
}
