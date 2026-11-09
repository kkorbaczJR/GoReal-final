"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { handleBack } from "@/lib/back";

/** Screens where back leaves the app instead of going to the previous screen. */
const ROOTS = ["/", "/home", "/onboarding"];

/**
 * The Android back button in the phone app: closes the open layer, otherwise goes back one screen, and on
 * Today or during onboarding sends GoReal to the background like other apps. Does nothing on the web.
 */
export default function AndroidBack() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener("backButton", () => {
      if (handleBack()) return;
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      if (ROOTS.includes(path)) App.minimizeApp();
      else window.history.back();
    });
    return () => {
      listener.then((l) => l.remove());
    };
  }, []);
  return null;
}
