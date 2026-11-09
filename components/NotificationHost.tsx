"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { requestOpenStreak } from "@/lib/intents";
import { permission, registerServiceWorker, showSystem } from "@/lib/notifications/delivery";
import { breakEndNotif, detectEvents, isQuiet, usageTriggers } from "@/lib/notifications/triggers";
import type { Notif, NotifAction } from "@/lib/notifications/types";
import { markShown, pushNotif, useGoReal, type GoRealState } from "@/lib/store";
import { manualUsage } from "@/lib/usage";
import NotificationCard from "./NotificationCard";
import styles from "./NotificationHost.module.css";

const TICK_MS = 15_000;
const STALE_BANNER_MS = 60 * 60_000;
const BANNER_MS = 5_000;

function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}
const isVisible = () => document.visibilityState === "visible";

/**
 * Delivers notifications while GoReal is open or in the background. Nothing is scheduled: on every change
 * it asks the trigger engine what just happened (streak news, a new thing you can afford, phone time you
 * logged going near or over the limit) and the only timer is the end of a running break. It puts each one
 * in the inbox, pops up a banner when you are looking at the app and sends a system notification when you
 * are not. Live phone use (long sessions, off-limits apps) needs the Android tracker (see README).
 */
export default function NotificationHost() {
  const s = useGoReal()!;
  const router = useRouter();
  const pathname = usePathname();
  const visible = useSyncExternalStore(subscribeVisibility, isVisible, () => true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const id = setInterval(refresh, TICK_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => {
    if (permission() === "granted") void registerServiceWorker();
  }, []);

  const open = useCallback(
    (action: NotifAction) => {
      if (action === "shop") router.push("/shop");
      else {
        if (action === "streak") requestOpenStreak();
        if (pathname !== "/home") router.push("/home");
      }
    },
    [router, pathname],
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "goreal:notification-click") open(e.data.action as NotifAction);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [open]);

  const prev = useRef<GoRealState | undefined>(undefined);

  useEffect(() => {
    const nowMs = Date.now();
    const at = new Date(nowMs);
    const end = breakEndNotif(s, at);
    const due: Notif[] = [
      ...detectEvents(s, at, prev.current),
      ...usageTriggers(s, manualUsage(s.days, nowMs), at),
      ...(end && end.at <= nowMs ? [end] : []),
    ];
    prev.current = s;
    for (const n of due) {
      // Quiet hours only silence the lock screen. A finished break always gets through.
      const quiet = n.kind !== "breakEnd" && isQuiet(s.notif.prefs.quiet, nowMs);
      if (!visible && permission() === "granted" && !quiet) {
        pushNotif(n, { shown: true });
        void showSystem(n);
      } else {
        pushNotif(n, { shown: n.kind === "breakEnd" && visible });
      }
    }
  }, [s, now, visible]);

  const waiting = s.notif.inbox.filter((i) => !i.shown);
  const showable = visible && !s.activeBreak;
  const banner = showable ? waiting.find((i) => now - i.at < STALE_BANNER_MS) : undefined;
  const bannerId = banner?.id;
  const waitingIds = waiting.map((i) => i.id).join(",");

  useEffect(() => {
    if (!showable) return;
    for (const id of waitingIds.split(",")) if (id && id !== bannerId) markShown(id);
    if (!bannerId) return;
    const id = setTimeout(() => markShown(bannerId), BANNER_MS);
    return () => clearTimeout(id);
  }, [showable, bannerId, waitingIds]);

  return (
    <div className={styles.layer}>
      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.id}
            className={styles.banner}
            initial={{ y: -140, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -140, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.6, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -30) markShown(banner.id);
            }}
          >
            <NotificationCard
              kind={banner.kind}
              title={banner.title}
              body={banner.body}
              time="now"
              onClick={() => {
                markShown(banner.id);
                open(banner.action);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
