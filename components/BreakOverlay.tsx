"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { addDays, dayKey, formatClock } from "@/lib/date";
import { LEAVE_GRACE_SECONDS, dayQualifies, streakStatus } from "@/lib/rules";
import { finishBreak, getState, quitBreak, type GoRealState } from "@/lib/store";
import CountUp from "./CountUp";
import Button from "./Button";
import Mascot from "./Mascot";
import { CoinIcon } from "./StatPills";
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
  | { kind: "done"; coins: number; xp: number; minutes: number }
  | { kind: "quit"; reason: "gave-up" | "left" }
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
  const active = state.activeBreak;
  const [outcome, setOutcome] = useState<Outcome>({ kind: "running" });
  const [now, setNow] = useState(() => Date.now());
  const [tip, setTip] = useState(0);
  const [hold, setHold] = useState(false);
  const [dayJustCounted, setDayJustCounted] = useState(false);
  const hiddenAt = useRef<number | null>(null);

  const endsAt = active ? active.startedAt + active.minutes * 60_000 : 0;
  const totalMs = active ? active.minutes * 60_000 : 1;
  const leftMs = Math.max(0, endsAt - now);

  // Tick the clock and finish when time is up.
  useEffect(() => {
    if (outcome.kind !== "running" || !active) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt && hiddenAt.current === null) {
        const minutes = active.minutes;
        const reward = finishBreak();
        setDayJustCounted(!streakDoneBefore && streakDoneAfter());
        setOutcome({ kind: "done", minutes, ...reward });
      }
    }, 250);
    return () => clearInterval(id);
  }, [outcome.kind, active, endsAt, streakDoneBefore, streakDoneAfter]);

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
          quitBreak();
          setOutcome({ kind: "quit", reason: "left" });
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [outcome.kind]);

  // Keep the screen awake so the phone does not auto-lock (which would look like leaving).
  useEffect(() => {
    if (outcome.kind !== "running") return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, [outcome.kind]);

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 12_000);
    return () => clearInterval(id);
  }, []);

  // Hold-to-give-up so it never happens by accident.
  useEffect(() => {
    if (!hold) return;
    const id = setTimeout(() => {
      quitBreak();
      setOutcome({ kind: "quit", reason: "gave-up" });
      setHold(false);
    }, 1500);
    return () => clearTimeout(id);
  }, [hold]);

  return (
    <motion.div
      className={`${styles.overlay} ${outcome.kind === "running" ? styles.dark : styles.light}`}
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <AnimatePresence mode="wait">
        {outcome.kind === "running" && active && (
          <motion.div key="run" className={styles.content} exit={{ opacity: 0, y: -20 }}>
            <div className={styles.lockRow}>
              <LockIcon />
              <span>Break mode</span>
            </div>

            <div className={styles.center}>
              <TimerRing
                progress={1 - leftMs / totalMs}
                size={280}
                stroke={6}
                track="rgba(255, 255, 255,0.1)"
              >
                <Mascot mood="sleeping" size={124} onDark outfit={state.outfit} />
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
                    <LockIcon small />
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
              <Mascot mood="proud" size={170} outfit={state.outfit} />
              <h1 className={styles.resultTitle}>You did it!</h1>
              <p className={styles.resultSub}>{outcome.minutes === 1 ? "1 minute" : `${outcome.minutes} minutes`} in the real world.</p>
              <div className={styles.rewards}>
                <RewardPill delay={0.2}>
                  <CoinIcon size={20} /> +<CountUp to={outcome.coins} />
                </RewardPill>
                <RewardPill delay={0.4}>
                  <span className={styles.xp}>XP</span> +<CountUp to={outcome.xp} />
                </RewardPill>
              </div>
            </div>
            <Button full onClick={() => (dayJustCounted ? setOutcome({ kind: "streak" }) : onClose())}>
              Nice!
            </Button>
          </motion.div>
        )}

        {outcome.kind === "streak" && (
          <motion.div
            key="streak"
            className={styles.content}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div />
            <StreakCelebration />
            <Button full onClick={onClose}>
              Continue
            </Button>
          </motion.div>
        )}

        {outcome.kind === "quit" && (
          <motion.div
            key="quit"
            className={styles.content}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div />
            <div className={styles.center}>
              <Mascot mood="sad" size={160} outfit={state.outfit} />
              <h1 className={styles.resultTitle}>Break ended early</h1>
              <p className={styles.resultSub}>
                {outcome.reason === "left"
                  ? "You left the app, so Rilo woke up. No coins this time."
                  : "No coins this time. Shorter breaks are fine too!"}
              </p>
            </div>
            <Button full onClick={onClose}>
              Try again
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

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];
const ENERGETIC = [0.34, 1.56, 0.64, 1] as const;

/** Me+-style streak moment, shown when a break makes today count. */
function StreakCelebration() {
  const fresh = getState();
  const { count } = streakStatus(fresh.days, fresh);
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <div className={styles.center}>
      <motion.div
        initial={{ scale: 0.3, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: ENERGETIC }}
      >
        <PixelFlame size={112} />
      </motion.div>
      <div className={styles.streakNumber}>
        <CountUp from={Math.max(0, count - 1)} to={count} duration={600} delay={450} />
      </div>
      <div className={styles.streakLabel}>day streak!</div>

      <motion.div
        className={styles.weekCard}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45, ease: ENERGETIC }}
      >
        <div className={styles.weekRow}>
          {week.map((d, i) => {
            const done = dayQualifies(fresh.days[dayKey(d)], fresh);
            const isToday = i === 6;
            return (
              <div key={i} className={styles.weekDay}>
                <span className={`${styles.weekLabel} ${isToday ? styles.weekLabelToday : ""}`}>{WEEKDAY[d.getDay()]}</span>
                <motion.span
                  className={`${styles.weekDot} ${done ? styles.weekDone : ""}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: isToday ? 1.2 : 0.6 + i * 0.06, duration: isToday ? 0.5 : 0.35, ease: ENERGETIC }}
                >
                  {done && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </motion.span>
              </div>
            );
          })}
        </div>
        <p className={styles.streakLine}>
          {count === 1 ? "Day one. Every streak starts here." : "You're on a roll. Take a break tomorrow to keep it going."}
        </p>
      </motion.div>
    </div>
  );
}

const FLAME_ROWS: [number, number, number][] = [
  [0, 4, 4], [1, 4, 5], [2, 3, 5], [3, 3, 6], [4, 2, 6], [5, 2, 7], [6, 1, 7],
  [7, 1, 8], [8, 0, 8], [9, 0, 8], [10, 0, 8], [11, 1, 7], [12, 2, 6],
];
const FLAME_CORE: [number, number, number][] = [[7, 4, 4], [8, 3, 5], [9, 3, 5], [10, 3, 5], [11, 4, 4]];

function PixelFlame({ size }: { size: number }) {
  const px = (rows: [number, number, number][], fill: string) =>
    rows.flatMap(([y, x0, x1]) =>
      Array.from({ length: x1 - x0 + 1 }, (_, i) => <rect key={`${fill}${x0 + i},${y}`} x={x0 + i} y={y} width={1.02} height={1.02} fill={fill} />),
    );
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="-2.5 -1 14 15"
      shapeRendering="crispEdges"
      aria-hidden
      animate={{ scaleY: [1, 1.06, 1], scaleX: [1, 0.96, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: (t: number) => Math.round(t * 2) / 2 }}
      style={{ originY: 1 }}
    >
      {px(FLAME_ROWS, "var(--accent)")}
      {px(FLAME_CORE, "#ffffff")}
    </motion.svg>
  );
}

function LockIcon({ small = false }: { small?: boolean }) {
  const s = small ? 12 : 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <rect x="5" y="11" width="14" height="10" rx="3" fill="currentColor" stroke="none" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
