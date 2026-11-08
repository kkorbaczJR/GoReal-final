"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import BreakOverlay from "@/components/BreakOverlay";
import Button from "@/components/Button";
import Mascot from "@/components/Mascot";
import Sheet from "@/components/Sheet";
import StatPills from "@/components/StatPills";
import TimerRing from "@/components/TimerRing";
import { dayKey, formatMinutes } from "@/lib/date";
import { BREAK_LENGTH_OPTIONS, dayQualifies, rewardForBreak, streakStatus } from "@/lib/rules";
import { clearNotice, getState, logPhoneTime, startBreak, useGoReal } from "@/lib/store";
import shared from "../tabs.module.css";
import styles from "./home.module.css";

const LENGTHS =
  process.env.NODE_ENV === "development" ? [1, ...BREAK_LENGTH_OPTIONS] : BREAK_LENGTH_OPTIONS;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const s = useGoReal()!;
  const [minutes, setMinutes] = useState(15);
  const [overlay, setOverlay] = useState<{ doneBefore: boolean } | null>(null);
  const [phoneSheet, setPhoneSheet] = useState(false);

  const streak = streakStatus(s.days, s);
  const today = s.days[dayKey()] ?? { breakMinutes: 0 };
  const breakProgress = Math.min(1, today.breakMinutes / s.breakGoal);

  const begin = () => {
    startBreak(minutes);
    setOverlay({ doneBefore: streak.todayDone });
  };

  const todayCountsNow = useCallback(() => {
    const fresh = getState();
    return dayQualifies(fresh.days[dayKey()], fresh);
  }, []);

  const mood = streak.lostStreak > 0 ? "sad" : streak.todayDone ? "proud" : "happy";

  return (
    <main className={shared.page}>
      <div className={shared.top}>
        <span className={shared.date}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </span>
        <StatPills streak={streak.count} streakLit={streak.todayDone} coins={s.coins} />
      </div>

      <h1 className={shared.heading}>
        {greeting()}, {s.name}
      </h1>

      <AnimatePresence>
        {streak.lostStreak > 0 && (
          <motion.p
            className={styles.lost}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            Your {streak.lostStreak}-day streak ended. One break today starts a new one.
          </motion.p>
        )}
      </AnimatePresence>

      <section className={styles.timer}>
        <TimerRing progress={minutes / 60} size={260} stroke={8}>
          <Mascot mood={mood} size={116} outfit={s.outfit} />
          <div className={styles.minutes}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={minutes}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
              >
                {minutes}
              </motion.span>
            </AnimatePresence>
            <small>min</small>
          </div>
        </TimerRing>

        <div className={styles.lengths} role="radiogroup" aria-label="Break length">
          {LENGTHS.map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={m === minutes}
              className={`${styles.length} ${m === minutes ? styles.lengthOn : ""}`}
              onClick={() => setMinutes(m)}
            >
              {m === minutes && (
                <motion.span
                  layoutId="length-pill"
                  className={styles.lengthPill}
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span className={styles.lengthText}>{m}</span>
            </button>
          ))}
        </div>

        <Button full variant="accent" onClick={begin}>
          Start break
        </Button>
        <p className={styles.earn}>
          Finish it to earn {rewardForBreak(minutes, true).coins} coins
        </p>
      </section>

      <section>
        <div className={styles.todayHead}>
          <h2 className={shared.sectionTitle} style={{ marginBottom: 0 }}>Today</h2>
          <span className={`${styles.badge} ${streak.todayDone ? styles.badgeOn : ""}`}>
            {streak.todayDone ? "Day counted" : "One of these counts"}
          </span>
        </div>

        <div className={shared.group}>
          <div className={`${shared.groupRow} ${styles.goalRow}`}>
            <div className={styles.goalText}>
              <span>Break time</span>
              <span className={styles.value}>
                {today.breakMinutes} of {formatMinutes(s.breakGoal)}
              </span>
            </div>
            <div className={styles.bar}>
              <motion.div
                className={styles.barFill}
                initial={false}
                animate={{ width: `${breakProgress * 100}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          </div>

          <button className={shared.groupRow} onClick={() => setPhoneSheet(true)}>
            <div className={styles.goalText}>
              <span>Phone time under {formatMinutes(s.phoneLimit)}</span>
              <span className={styles.value}>
                {today.phoneMinutes === undefined ? "Log" : formatMinutes(today.phoneMinutes)}
              </span>
            </div>
            <svg className={styles.chev} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </section>

      <PhoneTimeSheet
        open={phoneSheet}
        onClose={() => setPhoneSheet(false)}
        initial={today.phoneMinutes ?? s.phoneLimit}
        limit={s.phoneLimit}
      />

      <Sheet open={s.notice === "left-during-break"} onClose={clearNotice}>
        <div className={styles.noticeBody}>
          <Mascot mood="sad" size={110} />
          <h2>Your last break ended</h2>
          <p className={shared.muted}>GoReal was closed during a break, so it did not count. Try a shorter one?</p>
          <Button full onClick={clearNotice}>
            Okay
          </Button>
        </div>
      </Sheet>

      <AnimatePresence>
        {overlay && (
          <BreakOverlay
            state={s}
            streakDoneBefore={overlay.doneBefore}
            streakDoneAfter={todayCountsNow}
            onClose={() => setOverlay(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function PhoneTimeSheet({
  open,
  onClose,
  initial,
  limit,
}: {
  open: boolean;
  onClose: () => void;
  initial: number;
  limit: number;
}) {
  const [value, setValue] = useState(initial);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setValue(initial);
  }
  const under = value <= limit;

  return (
    <Sheet open={open} onClose={onClose}>
      <div className={styles.noticeBody}>
        <h2>Phone time today</h2>
        <p className={shared.muted}>
          Check Screen Time (iPhone) or Digital Wellbeing (Android) and enter your total.
        </p>
        <div className={styles.stepper}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setValue((v) => Math.max(0, v - 15))} aria-label="Less">
            −
          </motion.button>
          <div className={styles.stepValue}>
            <span>{formatMinutes(value)}</span>
            <small className={under ? styles.under : styles.over}>
              {under ? "Under your limit" : `Over your ${formatMinutes(limit)} limit`}
            </small>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setValue((v) => Math.min(720, v + 15))} aria-label="More">
            +
          </motion.button>
        </div>
        <Button
          full
          onClick={() => {
            logPhoneTime(value);
            onClose();
          }}
        >
          Save
        </Button>
      </div>
    </Sheet>
  );
}
