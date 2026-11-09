"use client";

import { motion } from "framer-motion";
import { addDays, dayKey, formatMinutes } from "@/lib/date";
import { dayQualifies, longestStreak, streakStatus } from "@/lib/rules";
import { getState } from "@/lib/store";
import Button from "./Button";
import CountUp from "./CountUp";
import { PixelIcon } from "./PixelIcon";
import styles from "./StreakScreen.module.css";

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];
const ENERGETIC = [0.34, 1.56, 0.64, 1] as const;

/**
 * Me+-style streak screen. `celebrate` is for the moment a break makes today count:
 * the number ticks up by one and today's circle pops in last.
 */
export default function StreakScreen({ onClose, celebrate = false }: { onClose: () => void; celebrate?: boolean }) {
  const s = getState();
  const { count, todayDone } = streakStatus(s.days, s);
  const best = longestStreak(s.days, s);
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  const line = celebrate
    ? count === 1
      ? "Day one. Every streak starts here."
      : "You're on a roll. Take a break tomorrow to keep it going."
    : todayDone
      ? "Today already counts. See you tomorrow!"
      : count > 0
        ? "Today doesn't count yet. One break keeps your streak alive."
        : "Finish your break goal or stay under your phone limit to start a streak.";

  return (
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
    >
      <div className={styles.content}>
        <div />
        <div className={styles.center}>
          <motion.div
            initial={{ scale: 0.3, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ duration: 0.55, ease: ENERGETIC }}
          >
            <motion.div
              animate={count > 0 ? { scaleY: [1, 1.06, 1], scaleX: [1, 0.96, 1] } : undefined}
              transition={{ duration: 0.8, repeat: Infinity, ease: (t: number) => Math.round(t * 2) / 2 }}
              style={{ originY: 1 }}
            >
              <PixelIcon name="flame" size={120} dim={count === 0} />
            </motion.div>
          </motion.div>
          <div className={styles.number}>
            <CountUp from={celebrate ? Math.max(0, count - 1) : 0} to={count} duration={celebrate ? 600 : 800} delay={350} />
          </div>
          <div className={`${styles.label} ${count === 0 ? styles.labelOff : ""}`}>
            {count === 0 ? "day streak" : "day streak!"}
          </div>

          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.45, ease: ENERGETIC }}
          >
            <div className={styles.week}>
              {week.map((d, i) => {
                const done = dayQualifies(s.days[dayKey(d)], s);
                const isToday = i === 6;
                return (
                  <div key={i} className={styles.day}>
                    <span className={`${styles.dayLabel} ${isToday ? styles.dayLabelToday : ""}`}>
                      {WEEKDAY[d.getDay()]}
                    </span>
                    <motion.span
                      className={`${styles.dot} ${done ? styles.dotDone : ""} ${isToday && !done ? styles.dotToday : ""}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: celebrate && isToday ? 1.2 : 0.5 + i * 0.06,
                        duration: celebrate && isToday ? 0.5 : 0.35,
                        ease: ENERGETIC,
                      }}
                    >
                      {done && <PixelIcon name="check" size={24} />}
                    </motion.span>
                  </div>
                );
              })}
            </div>
            <p className={styles.line}>{line}</p>
            <div className={styles.facts}>
              <div>
                <span className={styles.factValue}>{best} {best === 1 ? "day" : "days"}</span>
                <span className={styles.factLabel}>Best streak</span>
              </div>
              <div>
                <span className={styles.factValue}>
                  {formatMinutes(s.breakGoal)} / {formatMinutes(s.phoneLimit)}
                </span>
                <span className={styles.factLabel}>Breaks or phone limit</span>
              </div>
            </div>
          </motion.div>
        </div>
        <Button full onClick={onClose}>
          Continue
        </Button>
      </div>
    </motion.div>
  );
}
