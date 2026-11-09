"use client";

import { useEffect } from "react";
import { addDays, dayKey, parseDayKey } from "@/lib/date";
import { canMeasure, getPhone, readPhone } from "@/lib/phone";
import { getState, phoneReadFailed, syncPhoneTime, useGoReal } from "@/lib/store";

const EVERY_MS = 60_000;
/** Today and the two days before: enough to settle yesterday, well inside what Android keeps. */
const DAYS_BACK = 2;

/** Reads phone time now and saves it. Safe to call any time; does nothing on the web. */
export async function refreshPhone() {
  if (!canMeasure()) return;
  const s = getState();
  if (!s.onboarded) return;
  const today = new Date();
  const earliest = dayKey(addDays(today, -DAYS_BACK));
  const first = s.startedOn && s.startedOn > earliest ? s.startedOn : earliest;
  const reading = await readPhone(s.blockedApps, parseDayKey(first).getTime());
  if (reading) syncPhoneTime(reading.totals);
  else phoneReadFailed(getPhone().access === "off");
}

/**
 * Keeps measured phone time fresh in the Android app: when GoReal opens, when it comes back to the screen and
 * every minute while it is on screen. Turning on usage access in Settings is noticed on the way back.
 */
export default function PhoneTracker() {
  const s = useGoReal();
  const onboarded = !!s?.onboarded;
  const apps = s?.blockedApps.join(",");

  useEffect(() => {
    if (!onboarded || !canMeasure()) return;
    const run = () => {
      if (document.visibilityState === "visible") void refreshPhone();
    };
    run();
    const id = setInterval(run, EVERY_MS);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", run);
    };
  }, [onboarded, apps]);

  return null;
}
