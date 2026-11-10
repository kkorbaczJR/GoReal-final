"use client";

import { Capacitor } from "@capacitor/core";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BASE_PATH } from "@/lib/base";
import { useGoReal } from "@/lib/store";
import Button from "./Button";
import styles from "./PwaHost.module.css";

/** How often an app left open looks for a new version when it comes back to the screen. */
const CHECK_EVERY_MS = 15 * 60_000;

/**
 * Sets up the service worker (offline copy, see public/sw.js) and offers new versions.
 * A new version waits until you tap Refresh, never during a break: reloading then would end the break.
 */
export default function PwaHost() {
  const s = useGoReal();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [later, setLater] = useState(false);
  const refreshing = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || Capacitor.isNativePlatform()) return;
    const sw = navigator.serviceWorker;
    let registration: ServiceWorkerRegistration | undefined;
    let checkedAt = Date.now();

    const watch = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const check = () => {
        // With no controller this is the first install, which takes over by itself.
        if (worker.state === "installed" && sw.controller) setWaiting(worker);
        else setWaiting((w) => (w === worker ? null : w));
      };
      check();
      worker.addEventListener("statechange", check);
    };

    sw.register(`${BASE_PATH}/sw.js`)
      .then((r) => {
        registration = r;
        watch(r.waiting);
        watch(r.installing);
        r.addEventListener("updatefound", () => watch(r.installing));
      })
      .catch(() => {});

    const onVisible = () => {
      if (document.visibilityState !== "visible" || !registration) return;
      if (Date.now() - checkedAt < CHECK_EVERY_MS) return;
      checkedAt = Date.now();
      registration.update().catch(() => {});
    };
    const onTakeOver = () => {
      if (refreshing.current) window.location.reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    sw.addEventListener("controllerchange", onTakeOver);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      sw.removeEventListener("controllerchange", onTakeOver);
    };
  }, []);

  const refresh = () => {
    if (!waiting) return;
    refreshing.current = true;
    waiting.postMessage({ type: "goreal:update" });
    setTimeout(() => window.location.reload(), 3000);
  };

  const show = waiting !== null && !later && !s?.activeBreak;

  return (
    <div className={styles.layer}>
      <AnimatePresence>
        {show && (
          <motion.div
            className={styles.banner}
            role="status"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          >
            <div className={styles.text}>
              <strong>New version ready</strong>
              <span>Refresh to get it.</span>
            </div>
            <Button size="small" variant="ghost" className={styles.later} onClick={() => setLater(true)}>
              Later
            </Button>
            <Button size="small" variant="light" onClick={refresh}>
              Refresh
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
