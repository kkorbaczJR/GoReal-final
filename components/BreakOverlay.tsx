"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { onBack } from "@/lib/back";
import { formatClock } from "@/lib/date";
import { LEAVE_GRACE_SECONDS, rewardForBreak } from "@/lib/rules";
import { finishBreak, markBreakShown, quitBreak, type GoRealState } from "@/lib/store";
import CountUp from "./CountUp";
import Button from "./Button";
import Mascot from "./Mascot";
import { PixelIcon } from "./PixelIcon";
import StreakScreen from "./StreakScreen";
import TimerRing from "./TimerRing";
import styles from "./BreakOverlay.module.css";

const TIPS = [
  "Look out of the window for a bit.",
  "Stretch your arms up high.",
  "Drink a glass of water.",
  "Say hi to someone nearby.",
  "Take five slow, deep breaths.",
  "Tidy one small thing around you.",
];

type Outcome =
  | { kind: "running" }
  | { kind: "done"; coins: number; minutes: number }
  | { kind: "quit"; reason: "gave-up" | "left" | "elsewhere" }
  | { kind: "streak" };

type Props = {
  state: GoRealState;
  onClose: () => void;
  /** Whether today already counted for the streak when the break started. */
  streakDoneBefore: boolean;
  /** Reads whether today counts after the break's minutes were saved. */
  streakDoneAfter: () => boolean;
};

/** Full-screen "locked" mode shown while a break runs, plus the result screens. */
export default function BreakOverlay({ state, onClose, streakDoneBefore, streakDoneAfter }: Props) {
  // Freeze the break this screen is timing. The store may clear it (another window, or finishBreak
  // itself) before React has switched this screen to "You did it" — without this, the overlay goes blank.
  const [brk] = useState(() => state.activeBreak);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "running" });
  const [now, setNow] = useState(() => Date.now());
  const [tip, setTip] = useState(0);
  const [hold, setHold] = useState(false);
  const [dayJustCounted, setDayJustCounted] = useState(false);
  const hiddenAt = useRef<number | null>(null);
  const ended = useRef(false);

  const end = (next: Outcome) => {
    if (ended.current) return;
    ended.current = true;
    setOutcome(next);
  };

  // Back does nothing here: a break ends with its own buttons, not by accident.
  useEffect(() => onBack(() => {}), []);

  const endsAt = brk ? brk.startedAt + brk.minutes * 60_000 : 0;
  const totalMs = brk ? brk.minutes * 60_000 : 1;
  const leftMs = Math.max(0, endsAt - now);

  // Tick the clock and finish when time is up. Coins are computed here so a second tick, or the store
  // already having cleared the break, cannot show "+0".
  useEffect(() => {
    if (outcome.kind !== "running" || !brk) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt && hiddenAt.current === null && !ended.current) {
        const minutes = brk.minutes;
        const coins = rewardForBreak(minutes, true).coins;
        ended.current = true;
        finishBreak();
        setDayJustCounted(!streakDoneBefore && streakDoneAfter());
        setOutcome({ kind: "done", minutes, coins });
      }
    }, 250);
    return () => clearInterval(id);
  }, [outcome.kind, brk, endsAt, streakDoneBefore, streakDoneAfter]);

  // Leaving the app breaks the session (a web app cannot block other apps, so this is how we "lock").
  useEffect(() => {
    if (outcome.kind !== "running") return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
      } else if (hiddenAt.current !== null) {
        const away = (Date.now() - hiddenAt.current) / 1000;
        hiddenAt.current = null;
        if (away > LEAVE_GRACE_SECONDS) {
          ended.current = true;
          quitBreak();
          setOutcome({ kind: "quit", reason: "left" });
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [outcome.kind]);

  // Tell other GoReal windows this break is on screen, so opening one does not end it.
  useEffect(() => {
    if (outcome.kind !== "running" || !brk) return;
    const beat = () => {
      if (document.visibilityState === "visible") markBreakShown();
    };
    beat();
    const id = setInterval(beat, 1000);
    return () => clearInterval(id);
  }, [outcome.kind, brk]);

  // Another window ended it. Skip if this window just finished it (finishBreak clears the store first).
  useEffect(() => {
    if (ended.current || outcome.kind !== "running") return;
    if (!state.activeBreak) end({ kind: "quit", reason: "elsewhere" });
  }, [state.activeBreak, outcome.kind]);

  // Keep the screen awake so the phone does not auto-lock (which would look like leaving).
  const awake = outcome.kind === "running";
  useEffect(() => {
    if (!awake) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, [awake]);

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 12_000);
    return () => clearInterval(id);
  }, []);

  // Hold-to-give-up so it never happens by accident.
  useEffect(() => {
    if (!hold) return;
    const id = setTimeout(() => {
      ended.current = true;
      quitBreak();
      setOutcome({ kind: "quit", reason: "gave-up" });
      setHold(false);
    }, 1500);
    return () => clearTimeout(id);
  }, [hold]);

  if (!brk && outcome.kind === "running") return null;

  return (
    <motion.div
      className={`${styles.overlay} ${outcome.kind === "running" ? styles.dark : styles.light}`}
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <AnimatePresence mode="wait">
        {outcome.kind === "running" && brk && (
          <motion.div key="run" className={styles.content} exit={{ opacity: 0, y: -20 }}>
            <div className={styles.lockRow}>
              <PixelIcon name="lock" size={12} />
              <span>Break mode</span>
            </div>

            <div className={styles.center}>
              <TimerRing
                progress={1 - leftMs / totalMs}
                size={280}
                stroke={6}
                track="rgba(255, 255, 255,0.1)"
              >
                <Mascot mood="sleeping" size={124} onDark outfit={state.outfit} face={state.face} />
                <div className={styles.clock}>{formatClock(leftMs / 1000)}</div>
              </TimerRing>

              <AnimatePresence mode="wait">
                <motion.p
                  key={tip}
                  className={styles.tip}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  {TIPS[tip]}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className={styles.blocked}>
              <p className={styles.blockedTitle}>Off limits right now</p>
              <div className={styles.chips}>
                {state.blockedApps.map((a) => (
                  <span key={a} className={styles.chip}>
                    <PixelIcon name="lock" size={12} />
                    {a}
                  </span>
                ))}
              </div>
              <p className={styles.warning}>Keep GoReal open. Leaving the app ends the break.</p>
            </div>

            <button
              className={styles.giveUp}
              onPointerDown={() => setHold(true)}
              onPointerUp={() => setHold(false)}
              onPointerLeave={() => setHold(false)}
              onPointerCancel={() => setHold(false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <motion.span
                className={styles.giveUpFill}
                initial={false}
                animate={{ width: hold ? "100%" : "0%" }}
                transition={{ duration: hold ? 1.5 : 0.25, ease: "linear" }}
              />
              <span className={styles.giveUpText}>Hold to give up</span>
            </button>
          </motion.div>
        )}

        {outcome.kind === "done" && (
          <motion.div
            key="done"
            className={styles.content}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <div />
            <div className={styles.center}>
              <Mascot mood="proud" size={170} outfit={state.outfit} face={state.face} />
              <h1 className={styles.resultTitle}>You did it!</h1>
              <p className={styles.resultSub}>{outcome.minutes === 1 ? "1 minute" : `${outcome.minutes} minutes`} in the real world.</p>
              <div className={styles.rewards}>
                <RewardPill delay={0.2}>
                  <PixelIcon name="coin" size={24} /> +<CountUp to={outcome.coins} />
                </RewardPill>
                <RewardPill delay={0.4}>
                  <PixelIcon name="clock" size={24} /> <CountUp to={outcome.minutes} /> min
                </RewardPill>
              </div>
            </div>
            <Button full onClick={() => (dayJustCounted ? setOutcome({ kind: "streak" }) : onClose())}>
              Nice!
            </Button>
          </motion.div>
        )}

        {outcome.kind === "streak" && <StreakScreen key="streak" celebrate onClose={onClose} />}

        {outcome.kind === "quit" && (
          <motion.div
            key="quit"
            className={styles.content}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div />
            <div className={styles.center}>
              <Mascot mood={outcome.reason === "elsewhere" ? "happy" : "sad"} size={160} outfit={state.outfit} face={state.face} />
              <h1 className={styles.resultTitle}>{outcome.reason === "elsewhere" ? "Break over" : "Break ended early"}</h1>
              <p className={styles.resultSub}>
                {outcome.reason === "left"
                  ? "You left the app, so Rilo woke up. No coins this time."
                  : outcome.reason === "elsewhere"
                    ? "This break ended in another GoReal window."
                    : "No coins this time. Shorter breaks are fine too!"}
              </p>
            </div>
            <Button full onClick={onClose}>
              {outcome.reason === "elsewhere" ? "Okay" : "Try again"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RewardPill({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      className={styles.reward}
      initial={{ scale: 0.4, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 400, damping: 18 }}
    >
      {children}
    </motion.div>
  );
}
