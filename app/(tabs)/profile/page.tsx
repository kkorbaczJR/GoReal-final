"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/Button";
import Mascot from "@/components/Mascot";
import Sheet from "@/components/Sheet";
import { FlameIcon } from "@/components/StatPills";
import { achievements } from "@/lib/achievements";
import { addDays, dayKey, formatMinutes, weekStart } from "@/lib/date";
import { TIERS } from "@/lib/league";
import { BREAK_GOAL_OPTIONS, PHONE_LIMIT_OPTIONS, dayQualifies, longestStreak, streakStatus } from "@/lib/rules";
import { titleName } from "@/lib/shop";
import { resetEverything, setGoals, useGoReal } from "@/lib/store";
import shared from "../tabs.module.css";
import styles from "./profile.module.css";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function Profile() {
  const s = useGoReal()!;
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);

  const streak = streakStatus(s.days, s);
  const best = longestStreak(s.days, s);
  const list = achievements(s);
  const unlocked = list.filter((a) => a.unlocked).length;
  const monday = weekStart();
  const today = dayKey();

  const stats = [
    { label: "Off-screen", value: formatMinutes(s.totalBreakMinutes) },
    { label: "Streak", value: `${streak.count} ${streak.count === 1 ? "day" : "days"}` },
    { label: "Longest streak", value: `${best} ${best === 1 ? "day" : "days"}` },
    { label: "Breaks done", value: String(s.completedBreaks) },
    { label: "XP total", value: String(s.xp) },
    { label: "League", value: TIERS[s.league.tier].name },
  ];

  return (
    <main className={shared.page}>
      <section className={styles.hero}>
        <Mascot mood={streak.todayDone ? "proud" : "happy"} size={116} outfit={s.outfit} />
        <h1 className={styles.name}>{s.name}</h1>
        <span className={styles.title}>{titleName(s.title)}</span>
      </section>

      <section className={shared.card}>
        <h2 className={shared.sectionTitle}>This week</h2>
        <div className={styles.week}>
          {WEEKDAYS.map((d, i) => {
            const key = dayKey(addDays(monday, i));
            const done = dayQualifies(s.days[key], s);
            const isToday = key === today;
            return (
              <div key={i} className={styles.day}>
                <motion.span
                  className={`${styles.dayDot} ${done ? styles.dayDone : ""} ${isToday ? styles.dayToday : ""}`}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 20 }}
                >
                  {done ? <FlameIcon size={16} /> : null}
                </motion.span>
                <span className={styles.dayLabel}>{d}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.stats}>
        {stats.map((st) => (
          <div key={st.label} className={styles.stat}>
            <span className={styles.statValue}>{st.value}</span>
            <span className={styles.statLabel}>{st.label}</span>
          </div>
        ))}
      </section>

      <section className={shared.card}>
        <h2 className={shared.sectionTitle}>My goal</h2>
        <p className={styles.goalHint}>
          A day counts for your streak if you stay under your phone limit <b>or</b> finish your break goal.
        </p>
        <Segmented
          label="Phone limit per day"
          options={PHONE_LIMIT_OPTIONS}
          value={s.phoneLimit}
          onChange={(v) => setGoals({ phoneLimit: v })}
        />
        <Segmented
          label="Break goal per day"
          options={BREAK_GOAL_OPTIONS}
          value={s.breakGoal}
          onChange={(v) => setGoals({ breakGoal: v })}
        />
        <div className={styles.apps}>
          <span className={styles.segLabel}>Apps off limits during breaks</span>
          <div className={styles.chips}>
            {s.blockedApps.map((a) => (
              <span key={a} className={styles.chip}>{a}</span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className={shared.sectionTitle}>
          Achievements <span className={shared.muted}>{unlocked}/{list.length}</span>
        </h2>
        <div className={styles.badges}>
          {list.map((a, i) => (
            <motion.div
              key={a.id}
              className={`${styles.badge} ${a.unlocked ? styles.badgeOn : ""}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <span className={styles.badgeIcon}>
                {a.unlocked ? (
                  <svg width="26" height="26" viewBox="0 0 24 24">
                    <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#d97757" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9c6bb" strokeWidth="2.4" strokeLinecap="round">
                    <rect x="5" y="11" width="14" height="10" rx="3" fill="#c9c6bb" stroke="none" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                )}
              </span>
              <span className={styles.badgeName}>{a.name}</span>
              <span className={styles.badgeHint}>{a.hint}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <Button variant="ghost" size="medium" onClick={() => setConfirmReset(true)}>
        Start over
      </Button>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)}>
        <div className={styles.resetBody}>
          <Mascot mood="sad" size={100} />
          <h2>Start over?</h2>
          <p className={shared.muted}>This deletes your coins, streak, league and outfits on this phone.</p>
          <Button
            full
            onClick={() => {
              resetEverything();
              router.replace("/onboarding");
            }}
          >
            Yes, start over
          </Button>
          <Button full variant="secondary" onClick={() => setConfirmReset(false)}>
            Keep my progress
          </Button>
        </div>
      </Sheet>
    </main>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.seg}>
      <span className={styles.segLabel}>{label}</span>
      <div className={styles.segTrack}>
        {options.map((o) => (
          <button key={o} className={`${styles.segBtn} ${o === value ? styles.segOn : ""}`} onClick={() => onChange(o)}>
            {o === value && (
              <motion.span
                layoutId={`seg-${label}`}
                className={styles.segPill}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className={styles.segText}>{formatMinutes(o)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
