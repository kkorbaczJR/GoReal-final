"use client";

import { useState } from "react";
import { hideInstallCard, promptInstall, useInstallCardHidden, useInstallWay, type InstallWay } from "@/lib/install";
import Button from "./Button";
import Mascot from "./Mascot";
import { PixelIcon, type PixelIconName } from "./PixelIcon";
import Sheet from "./Sheet";
import styles from "./Install.module.css";

type Step = { icon: PixelIconName; text: React.ReactNode };

const STEPS: Partial<Record<InstallWay, { title: string; steps: Step[]; after?: string }>> = {
  ios: {
    title: "Add GoReal to your home screen",
    steps: [
      { icon: "share", text: <>Tap <b>Share</b>. In Safari it is at the bottom, in Chrome at the top.</> },
      { icon: "addBox", text: <>Scroll down and tap <b>Add to Home Screen</b>.</> },
      { icon: "check", text: <>Tap <b>Add</b>.</> },
    ],
    after: "Then open GoReal from its icon. It runs full screen and works without internet.",
  },
  android: {
    title: "Add GoReal to your home screen",
    steps: [
      { icon: "menuDots", text: <>Tap the <b>menu</b> at the top right of your browser.</> },
      { icon: "install", text: <>Tap <b>Install app</b> or <b>Add to Home screen</b>.</> },
      { icon: "check", text: <>Tap <b>Install</b>.</> },
    ],
    after: "Then open GoReal from its icon. It runs full screen and works without internet.",
  },
  inApp: {
    title: "Open GoReal in your browser",
    steps: [
      { icon: "menuDots", text: <>This page is open inside another app. Tap its <b>menu</b> (often ... at the top).</> },
      { icon: "share", text: <>Choose <b>Open in browser</b> (or <b>Open in Safari</b>).</> },
      { icon: "addBox", text: <>Come back to this screen there to add GoReal to your home screen.</> },
    ],
  },
};

/** One tap installs where the browser can do it; elsewhere a sheet explains the steps. */
export function useInstall() {
  const way = useInstallWay();
  const [sheet, setSheet] = useState(false);
  const canInstall = way === "prompt" || way in STEPS;
  const start = () => {
    if (way === "prompt") void promptInstall();
    else setSheet(true);
  };
  const ui = <InstallSheet open={sheet && way in STEPS} way={way} onClose={() => setSheet(false)} />;
  return { way, canInstall, start, ui };
}

function InstallSheet({ open, way, onClose }: { open: boolean; way: InstallWay; onClose: () => void }) {
  const info = STEPS[way];
  return (
    <Sheet open={open} onClose={onClose}>
      {info && (
        <div className={styles.sheet}>
          <h2>{info.title}</h2>
          <ol className={styles.steps}>
            {info.steps.map((step, i) => (
              <li key={i}>
                <span className={styles.stepIcon}>
                  <PixelIcon name={step.icon} size={24} />
                </span>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
          {info.after && <p className={styles.after}>{info.after}</p>}
          <Button full onClick={onClose}>
            Got it
          </Button>
        </div>
      )}
    </Sheet>
  );
}

/** "Get the app" card on Today, until it is installed or closed. */
export function InstallCard() {
  const { canInstall, start, ui } = useInstall();
  const hidden = useInstallCardHidden();
  if (!canInstall || hidden) return ui;
  return (
    <section className={styles.card}>
      <Mascot mood="happy" size={52} />
      <div className={styles.cardText}>
        <strong>Put GoReal on your home screen</strong>
        <span>It opens like an app and works without internet.</span>
        <div className={styles.cardButtons}>
          <Button size="small" variant="accent" onClick={start}>
            Install
          </Button>
          <Button size="small" variant="ghost" onClick={hideInstallCard}>
            Not now
          </Button>
        </div>
      </div>
      {ui}
    </section>
  );
}
