"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BreakOverlay from "@/components/BreakOverlay";
import Button from "@/components/Button";
import { InstallCard } from "@/components/Install";
import Mascot from "@/components/Mascot";
import NotificationBell from "@/components/NotificationBell";
import { PixelIcon } from "@/components/PixelIcon";
import Sheet from "@/components/Sheet";
import StatPills from "@/components/StatPills";
import StreakScreen from "@/components/StreakScreen";
import TimerRing from "@/components/TimerRing";
import { dayKey, formatMinutes } from "@/lib/date";
import { consumeOpenStreak, onOpenStreak } from "@/lib/intents";
import { canMeasure } from "@/lib/phone";
import { BREAK_LENGTH_OPTIONS, MAX_FREEZES, dayQualifies, goalsFor, rewardForBreak, streakStatus } from "@/lib/rules";
import { clearFreezeNotice, clearNotice, getState, logPhoneTime, startBreak, useGoReal } from "@/lib/store";
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
  const router = useRouter();
  const [minutes, setMinutes] = useState(15);
  const [overlay, setOverlay] = useState<{ doneBefore: boolean } | null>(null);
  const [phoneSheet, setPhoneSheet] = useState(false);
  const [showStreak, setShowStreak] = useState(consumeOpenStreak);

  useEffect(
    () =>
      onOpenStreak(() => {
        consumeOpenStreak();
        setShowStreak(true);
      }),
    [],
  );

  const streak = streakStatus(s.days, s);
  const today = s.days[dayKey()] ?? { breakMinutes: 0 };
  const goals = goalsFor(today, s);
  const breakProgress = Math.min(1, today.breakMinutes / goals.breakGoal);
  const measured = s.phoneTracking && canMeasure();

  const begin = () => {
    startBreak(minutes);
    setOverlay({ doneBefore: streak.todayDone });
  };

  const todayCountsNow = useCallback(() => {
    const fresh = getState();
    return dayQualifies(fresh.days[dayKey()], fresh, false);
  }, []);

  const mood = streak.lostStreak > 0 ? "sad" : streak.todayDone ? "proud" : "happy";

  return (
    <main className={shared.page}>
      <div className={shared.top}>
        <span className={shared.date}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </span>
        <StatPills
          streak={streak.count}
          streakLit={streak.todayDone}
          coins={s.coins}
          onStreakClick={() => setShowStreak(true)}
        />
      </div>

      <div className={styles.greetRow}>
        <h1 className={shared.heading}>
          {greeting()}, {s.name}
        </h1>
        <NotificationBell />
      </div>

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
          <Mascot mood={mood} size={116} outfit={s.outfit} face={s.face} />
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
          <span className={`${styles.badge} ${streak.todayDone || streak.todayOnTrack ? styles.badgeOn : ""}`}>
            {streak.todayDone ? "Day counted" : streak.todayOnTrack ? "On track" : "One of these counts"}
          </span>
        </div>

        <div className={shared.group}>
          <button className={shared.groupRow} onClick={() => setShowStreak(true)}>
            <div className={styles.streakRow}>
              <PixelIcon name="flame" size={24} dim={!streak.todayDone} />
              <span>Streak</span>
            </div>
            <span className={styles.value}>
              {streak.count} {streak.count === 1 ? "day" : "days"}
            </span>
            <PixelIcon name="chevronRight" size={12} className={styles.chev} />
          </button>

          <div className={`${shared.groupRow} ${styles.goalRow}`}>
            <div className={styles.goalText}>
              <span>Break time</span>
              <span className={styles.value}>
                {today.breakMinutes} of {formatMinutes(goals.breakGoal)}
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

          <button
            className={shared.groupRow}
            onClick={() => (measured ? router.push("/phone") : setPhoneSheet(true))}
          >
            <div className={styles.goalText}>
              <span>Phone time under {formatMinutes(goals.phoneLimit)}</span>
              <span className={styles.value}>
                {measured
                  ? formatMinutes(today.phoneMinutes ?? 0)
                  : today.phoneMinutes === undefined
                    ? "Log"
                    : formatMinutes(today.phoneMinutes)}
              </span>
            </div>
            <PixelIcon name="chevronRight" size={12} className={styles.chev} />
          </button>

          <button className={shared.groupRow} onClick={() => router.push("/shop")}>
            <div className={styles.streakRow}>
              <PixelIcon name="snowflake" size={24} dim={s.freezes === 0} />
              <span>Streak freezes</span>
            </div>
            <span className={styles.value}>
              {s.freezes} of {MAX_FREEZES}
            </span>
            <PixelIcon name="chevronRight" size={12} className={styles.chev} />
          </button>
        </div>
      </section>

      <InstallCard />

      <PhoneTimeSheet
        open={phoneSheet}
        onClose={() => setPhoneSheet(false)}
        initial={today.phoneMinutes ?? goals.phoneLimit}
        limit={goals.phoneLimit}
        onMeasure={
          canMeasure()
            ? () => {
                setPhoneSheet(false);
                router.push("/phone");
              }
            : undefined
        }
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

      <Sheet open={s.freezeNotice !== null} onClose={clearFreezeNotice}>
        {s.freezeNotice && (
          <div className={styles.noticeBody}>
            <PixelIcon name="snowflake" size={72} />
            <h2>
              {s.freezeNotice.days === 1 ? "A freeze saved your streak" : `${s.freezeNotice.days} freezes saved your streak`}
            </h2>
            <p className={shared.muted}>
              You missed {s.freezeNotice.days === 1 ? "a day" : `${s.freezeNotice.days} days`}, so your{" "}
              {s.freezeNotice.streak}-day streak is still alive.{" "}
              {s.freezeNotice.left === 0
                ? "That was your last freeze. You can get more in the shop."
                : `You have ${s.freezeNotice.left} left.`}
            </p>
            <Button full onClick={clearFreezeNotice}>
              Nice
            </Button>
          </div>
        )}
      </Sheet>

      <AnimatePresence>{showStreak && <StreakScreen onClose={() => setShowStreak(false)} />}</AnimatePresence>

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
  onMeasure,
}: {
  open: boolean;
  onClose: () => void;
  initial: number;
  limit: number;
  /** In the Android app: go set up measured phone time instead. */
  onMeasure?: () => void;
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
            <PixelIcon name="minus" size={24} />
          </motion.button>
          <div className={styles.stepValue}>
            <span>{formatMinutes(value)}</span>
            <small className={under ? styles.under : styles.over}>
              {under ? "Under your limit" : `Over your ${formatMinutes(limit)} limit`}
            </small>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setValue((v) => Math.min(720, v + 15))} aria-label="More">
            <PixelIcon name="plus" size={24} />
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
        {onMeasure && (
          <Button full variant="ghost" size="medium" onClick={onMeasure}>
            Let GoReal measure it
          </Button>
        )}
      </div>
    </Sheet>
  );
}
