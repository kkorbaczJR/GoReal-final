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
  30: "Mostly offline",
  60: "A good balance",
  120: "A gentle start",
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
        <button
          className={styles.back}
          onClick={() => go(-1)}
          style={{ visibility: step > 0 ? "visible" : "hidden" }}
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className={styles.progress} aria-label={`Step ${step + 1} of ${STEPS}`}>
          <motion.div
            className={styles.progressFill}
            initial={false}
            animate={{ width: `${((step + 1) / STEPS) * 100}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
        <span className={styles.backSpacer} />
      </header>

      <div className={styles.stage}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={step}
            className={styles.step}
            initial={{ x: dir * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -40, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {step === 0 && (
              <>
                <div className={styles.hero}>
                  <Mascot mood="wave" size={140} />
                </div>
                <h1 className={styles.title}>Hi, I&apos;m Rilo. What&apos;s your name?</h1>
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
                <p className={styles.hint}>Stay under it, or finish your daily breaks, and your streak grows.</p>
                <div className={styles.choices} role="radiogroup">
                  {PHONE_LIMIT_OPTIONS.map((m) => {
                    const on = limit === m;
                    return (
                      <motion.button
                        key={m}
                        role="radio"
                        aria-checked={on}
                        whileTap={{ scale: 0.98 }}
                        className={`${styles.choice} ${on ? styles.choiceOn : ""}`}
                        onClick={() => setLimit(m)}
                      >
                        <span className={styles.choiceText}>
                          <span className={styles.choiceLabel}>{formatMinutes(m)}</span>
                          <span className={styles.choiceNote}>{LIMIT_COPY[m]}</span>
                        </span>
                        <span className={styles.radio}>
                          <AnimatePresence>
                            {on && (
                              <motion.span
                                className={styles.radioDot}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: "spring", stiffness: 600, damping: 30 }}
                              />
                            )}
                          </AnimatePresence>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className={styles.title}>Which apps pull you in the most?</h1>
                <p className={styles.hint}>During a break these are off limits.</p>
                <div className={styles.apps}>
                  {APP_CHOICES.map((app) => {
                    const on = apps.includes(app);
                    return (
                      <motion.button
                        key={app}
                        whileTap={{ scale: 0.95 }}
                        className={`${styles.app} ${on ? styles.appOn : ""}`}
                        onClick={() => setApps((v) => (on ? v.filter((a) => a !== app) : [...v, app]))}
                        aria-pressed={on}
                      >
                        {app}
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className={styles.hero}>
                  <Mascot mood="sleeping" size={170} />
                </div>
                <h1 className={styles.title}>Rilo naps when you put the phone down</h1>
                <ul className={styles.facts}>
                  <li>1 minute of break earns 1 coin and 1 XP</li>
                  <li>Leave the app early and the break ends</li>
                  <li>Climb the weekly league and dress up Rilo</li>
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
            Get started
          </Button>
        )}
      </footer>
    </main>
  );
}
