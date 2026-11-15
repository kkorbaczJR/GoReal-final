"use client";

import { useState } from "react";
import { useCopy } from "@/lib/i18n";
import { hideInstallCard, promptInstall, useInstallCardHidden, useInstallWay, type InstallWay } from "@/lib/install";
import Button from "./Button";
import Mascot from "./Mascot";
import { PixelIcon, type PixelIconName } from "./PixelIcon";
import Sheet from "./Sheet";
import styles from "./Install.module.css";

const ICONS: Partial<Record<InstallWay, PixelIconName[]>> = {
  ios: ["share", "addBox", "check"],
  android: ["menuDots", "install", "check"],
  inApp: ["menuDots", "share", "addBox"],
};

function Rich({ parts }: { parts: string[] }) {
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>))}
    </>
  );
}

/** One tap installs where the browser can do it; elsewhere a sheet explains the steps. */
export function useInstall() {
  const way = useInstallWay();
  const [sheet, setSheet] = useState(false);
  const canInstall = way === "prompt" || way in ICONS;
  const start = () => {
    if (way === "prompt") void promptInstall();
    else setSheet(true);
  };
  const ui = <InstallSheet open={sheet && way in ICONS} way={way} onClose={() => setSheet(false)} />;
  return { way, canInstall, start, ui };
}

function InstallSheet({ open, way, onClose }: { open: boolean; way: InstallWay; onClose: () => void }) {
  const { c } = useCopy();
  const icons = ICONS[way];
  const title = way === "inApp" ? c.installInAppTitle : way === "android" ? c.installAndroidTitle : c.installIosTitle;
  const parts = way === "inApp" ? c.installInApp : way === "android" ? c.installAndroid : c.installIos;
  return (
    <Sheet open={open} onClose={onClose}>
      {icons && (
        <div className={styles.sheet}>
          <h2>{title}</h2>
          <ol className={styles.steps}>
            {icons.map((icon, i) => (
              <li key={i}>
                <span className={styles.stepIcon}>
                  <PixelIcon name={icon} size={24} />
                </span>
                <span><Rich parts={parts[i] ?? []} /></span>
              </li>
            ))}
          </ol>
          {way !== "inApp" && <p className={styles.after}>{c.installAfter}</p>}
          <Button full onClick={onClose}>
            {c.gotIt}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

/** "Get the app" card on Today, until it is installed or closed. */
export function InstallCard() {
  const { canInstall, start, ui } = useInstall();
  const { c } = useCopy();
  const hidden = useInstallCardHidden();
  if (!canInstall || hidden) return ui;
  return (
    <section className={styles.card}>
      <Mascot mood="happy" size={52} />
      <div className={styles.cardText}>
        <strong>{c.putHome}</strong>
        <span>{c.putHomeBody}</span>
        <div className={styles.cardButtons}>
          <Button size="small" variant="accent" onClick={start}>
            {c.installApp}
          </Button>
          <Button size="small" variant="ghost" onClick={hideInstallCard}>
            {c.notNowInstall}
          </Button>
        </div>
      </div>
      {ui}
    </section>
  );
}
