"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/Button";
import CountUp from "@/components/CountUp";
import { useInstall } from "@/components/Install";
import Mascot from "@/components/Mascot";
import Sheet from "@/components/Sheet";
import { PixelIcon } from "@/components/PixelIcon";
import RiloStage from "@/components/RiloStage";
import StreakScreen from "@/components/StreakScreen";
import { logOut, useAccount } from "@/lib/account";
import { achievements } from "@/lib/achievements";
import { addDays, dayKey, formatMinutes, weekStart } from "@/lib/date";
import { canMeasure } from "@/lib/phone";
import {
  BREAK_GOAL_OPTIONS,
  PHONE_LIMIT_OPTIONS,
  dayState,
  goalsFor,
  goalsWaitForTomorrow,
  longestStreak,
  streakStatus,
} from "@/lib/rules";
import { titleName } from "@/lib/shop";
import { resetEverything, setGoals, useGoReal } from "@/lib/store";
import shared from "../tabs.module.css";
import styles from "./profile.module.css";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function Profile() {
  const s = useGoReal()!;
  const todayGoals = goalsFor(s.days[dayKey()], s);
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [android] = useState(canMeasure);
  const account = useAccount();
  const install = useInstall();

  const streak = streakStatus(s.days, s);
  const best = longestStreak(s.days, s);
  const list = achievements(s);
  const unlocked = list.filter((a) => a.unlocked).length;
  const monday = weekStart();
  const today = dayKey();

  const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  const stats: { label: string; value: number | string; format?: (n: number) => string }[] = [
    { label: "Off-screen", value: s.totalBreakMinutes, format: formatMinutes },
    { label: "Streak", value: streak.count, format: days },
    { label: "Longest streak", value: best, format: days },
    { label: "Breaks done", value: s.completedBreaks },
    { label: "Longest break", value: s.longestBreak, format: formatMinutes },
    { label: "Shop items", value: s.owned.length },
  ];

  return (
    <main className={shared.page}>
      <section className={styles.hero}>
        <RiloStage
          mood={streak.todayDone ? "proud" : "happy"}
          outfit={s.outfit}
          face={s.face}
          neck={s.neck}
          back={s.back}
          background={s.background}
          size={116}
          height={170}
        />
        <h1 className={styles.name}>{s.name}</h1>
        <span className={styles.title}>{titleName(s.title)}</span>
      </section>

      <motion.button whileTap={{ scale: 0.98 }} className={`${shared.card} ${styles.weekCard}`} onClick={() => setShowStreak(true)}>
        <div className={styles.weekHead}>
          <h2 className={shared.sectionTitle}>This week</h2>
          <PixelIcon name="chevronRight" size={12} className={styles.chev} />
        </div>
        <div className={styles.week}>
          {WEEKDAYS.map((d, i) => {
            const key = dayKey(addDays(monday, i));
            const isToday = key === today;
            const state = dayState(s.days[key], s, isToday);
            const done = state === "done";
            return (
              <div key={i} className={styles.day}>
                <motion.span
                  className={`${styles.dayDot} ${done ? styles.dayDone : ""} ${isToday ? styles.dayToday : ""}`}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 20 }}
                >
                  {done ? (
                    <PixelIcon name="flame" size={34} viewBox="2 0 9 12" stretch className={styles.dayFlame} />
                  ) : state === "frozen" ? (
                    <PixelIcon name="snowflake" size={22} />
                  ) : null}
                </motion.span>
                <span className={styles.dayLabel}>{d}</span>
              </div>
            );
          })}
        </div>
      </motion.button>

      <AnimatePresence>{showStreak && <StreakScreen onClose={() => setShowStreak(false)} />}</AnimatePresence>

      <section className={styles.stats}>
        {stats.map((st) => (
          <div key={st.label} className={styles.stat}>
            <span className={styles.statValue}>
              {typeof st.value === "number" ? <CountUp to={st.value} format={st.format} /> : st.value}
            </span>
            <span className={styles.statLabel}>{st.label}</span>
          </div>
        ))}
      </section>

      <div className={shared.group}>
        {account.status !== "off" && (
          <button className={shared.groupRow} onClick={() => router.push("/account")}>
            <PixelIcon name="face" size={24} />
            <span className={styles.rowLabel}>Account</span>
            <span className={`${styles.rowValue} ${styles.rowEmail}`}>
              {account.status === "signedIn" ? account.email : account.status === "loading" ? "" : "Sign up"}
            </span>
            <PixelIcon name="chevronRight" size={12} className={styles.rowChev} />
          </button>
        )}
        <button className={shared.groupRow} onClick={() => router.push("/reminders")}>
          <PixelIcon name="bell" size={24} />
          <span className={styles.rowLabel}>Reminders</span>
          <span className={styles.rowValue}>
            {s.notif.prefs.enabled ? "On" : "Off"}
          </span>
          <PixelIcon name="chevronRight" size={12} className={styles.rowChev} />
        </button>
        {android && (
          <button className={shared.groupRow} onClick={() => router.push("/phone")}>
            <PixelIcon name="phone" size={24} />
            <span className={styles.rowLabel}>Phone time</span>
            <span className={styles.rowValue}>{s.phoneTracking ? "Measured" : "Set up"}</span>
            <PixelIcon name="chevronRight" size={12} className={styles.rowChev} />
          </button>
        )}
        {install.canInstall && (
          <button className={shared.groupRow} onClick={install.start}>
            <PixelIcon name="install" size={24} />
            <span className={styles.rowLabel}>Install app</span>
            <span className={styles.rowValue}>Home screen</span>
            <PixelIcon name="chevronRight" size={12} className={styles.rowChev} />
          </button>
        )}
      </div>
      {install.ui}

      <section className={shared.card}>
        <h2 className={shared.sectionTitle}>My goal</h2>
        <p className={styles.goalHint}>
          A day counts for your streak if you stay under your phone limit <b>or</b> finish your break goal. A change
          applies to today right away unless it would make today easier after you already made progress.
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
        {goalsWaitForTomorrow(s.days, s) && (
          <p className={styles.goalWait}>
            Today still runs on {formatMinutes(todayGoals.phoneLimit)} of phone time and a {formatMinutes(todayGoals.breakGoal)}{" "}
            break goal. Your new goals start tomorrow.
          </p>
        )}
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
                {a.unlocked ? <PixelIcon name="star" size={36} /> : <PixelIcon name="lock" size={24} dim />}
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
          <p className={shared.muted}>
            {account.status === "signedIn"
              ? "This deletes your coins, streak and shop items on this phone. Your account keeps them, so logging in brings them back."
              : "This deletes your coins, streak and shop items on this phone."}
          </p>
          <Button
            full
            onClick={() => {
              void (async () => {
                if (account.status === "signedIn") await logOut({ save: false });
                else resetEverything();
                router.replace("/onboarding");
              })();
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
