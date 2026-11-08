"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Mascot from "@/components/Mascot";
import Splash from "@/components/Splash";
import { formatMinutes } from "@/lib/date";
import { PHONE_LIMIT_OPTIONS } from "@/lib/rules";
import { completeOnboarding, useGoReal } from "@/lib/store";
import styles from "./onboarding.module.css";

const APP_CHOICES = [
  "TikTok", "Instagram", "YouTube", "Snapchat", "Discord", "Roblox",
  "WhatsApp", "X", "Twitch", "Reddit", "Netflix", "Games",
];

const LIMIT_COPY: Record<number, string> = {
  30: "Brave. Mostly offline.",
  60: "A good balance.",
  120: "A gentle start.",
};

const STEPS = 4;

export default function Onboarding() {
  const s = useGoReal();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState(60);
  const [apps, setApps] = useState<string[]>(["TikTok", "Instagram"]);

  useEffect(() => {
    if (s?.onboarded) router.replace("/home");
  }, [s, router]);

  if (!s || s.onboarded) return <Splash />;

  const go = (delta: number) => {
    setDir(delta);
    setStep((v) => Math.min(STEPS - 1, Math.max(0, v + delta)));
  };

  const finish = () => {
    completeOnboarding({ name: name.trim() || "Friend", phoneLimit: limit, blockedApps: apps });
    router.replace("/home");
  };

  const canContinue = step === 0 ? name.trim().length > 0 : step === 2 ? apps.length > 0 : true;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => go(-1)} style={{ visibility: step > 0 ? "visible" : "hidden" }} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className={styles.dots}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <motion.span
              key={i}
              className={styles.dot}
              animate={{ width: i === step ? 26 : 8, background: i <= step ? "#0b0b0c" : "#dcdce0" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          ))}
        </div>
        <span className={styles.back} />
      </header>

      <div className={styles.stage}>
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.section
            key={step}
            className={styles.step}
            custom={dir}
            initial={{ x: dir * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            {step === 0 && (
              <>
                <Mascot mood="wave" size={150} />
                <h1 className={styles.title}>Hey! I&apos;m Rilo.<br />What&apos;s your name?</h1>
                <input
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 20))}
                  placeholder="Your name"
                  autoComplete="given-name"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && canContinue && go(1)}
                />
              </>
            )}

            {step === 1 && (
              <>
                <h1 className={styles.title}>How much phone time is okay for you each day?</h1>
                <p className={styles.sub}>
                  Stay under it, or finish your daily breaks, and your streak grows.
                </p>
                <div className={styles.options}>
                  {PHONE_LIMIT_OPTIONS.map((m) => (
                    <motion.button
                      key={m}
                      whileTap={{ scale: 0.97 }}
                      className={`${styles.option} ${limit === m ? styles.optionOn : ""}`}
                      onClick={() => setLimit(m)}
                    >
                      <span className={styles.optionBig}>{formatMinutes(m)}</span>
                      <span className={styles.optionSmall}>{LIMIT_COPY[m]}</span>
                      <span className={styles.radio} />
                    </motion.button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className={styles.title}>Which apps pull you in the most?</h1>
                <p className={styles.sub}>During a break these are off limits.</p>
                <div className={styles.apps}>
                  {APP_CHOICES.map((app) => {
                    const on = apps.includes(app);
                    return (
                      <motion.button
                        key={app}
                        whileTap={{ scale: 0.92 }}
                        className={`${styles.app} ${on ? styles.appOn : ""}`}
                        onClick={() => setApps((v) => (on ? v.filter((a) => a !== app) : [...v, app]))}
                      >
                        <span className={styles.appIcon}>{app[0]}</span>
                        <span className={styles.appName}>{app}</span>
                        {on && (
                          <motion.span className={styles.check} initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12l5 5 9-10" />
                            </svg>
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <Mascot mood="sleeping" size={190} />
                <h1 className={styles.title}>Rilo naps when you put the phone down</h1>
                <ul className={styles.facts}>
                  <li><b>1 minute</b> of break = 1 coin and 1 XP</li>
                  <li>Leave the app early and the break ends</li>
                  <li>Climb the weekly league, dress up Rilo</li>
                </ul>
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      <footer className={styles.footer}>
        {step < STEPS - 1 ? (
          <Button full disabled={!canContinue} onClick={() => go(1)}>
            Continue
          </Button>
        ) : (
          <Button full variant="accent" onClick={finish}>
            Let&apos;s go{name.trim() ? `, ${name.trim()}` : ""}
          </Button>
        )}
      </footer>
    </main>
  );
}
