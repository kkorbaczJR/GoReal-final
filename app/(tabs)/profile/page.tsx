"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/Button";
import Flag from "@/components/Flags";
import CountUp from "@/components/CountUp";
import { useInstall } from "@/components/Install";
import Mascot from "@/components/Mascot";
import Sheet from "@/components/Sheet";
import { PixelIcon } from "@/components/PixelIcon";
import RiloStage from "@/components/RiloStage";
import ShareSheet from "@/components/ShareSheet";
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
import { useCopy, weekLetters } from "@/lib/i18n";
import { shareDetails } from "@/lib/shareStreak";
import { titleName } from "@/lib/shop";
import { resetEverything, setGoals, useGoReal } from "@/lib/store";
import shared from "../tabs.module.css";
import styles from "./profile.module.css";

export default function Profile() {
  const s = useGoReal()!;
  const { lang, c, setLang } = useCopy();
  const weekdays = weekLetters(lang, true);
  const todayGoals = goalsFor(s.days[dayKey()], s);
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [share, setShare] = useState(false);
  const [android] = useState(canMeasure);
  const account = useAccount();
  const install = useInstall();

  const streak = streakStatus(s.days, s);
  const best = longestStreak(s.days, s);
  const list = achievements(s);
  const unlocked = list.filter((a) => a.unlocked).length;
  const monday = weekStart();
  const today = dayKey();

  const stats: { label: string; value: number | string; format?: (n: number) => string }[] = [
    { label: c.offScreen, value: s.totalBreakMinutes, format: (n) => formatMinutes(n, lang) },
    { label: c.streak, value: streak.count, format: (n) => c.days(n) },
    { label: c.longestStreak, value: best, format: (n) => c.days(n) },
    { label: c.breaksDone, value: s.completedBreaks },
    { label: c.longestBreak, value: s.longestBreak, format: (n) => formatMinutes(n, lang) },
    { label: c.shopItems, value: s.owned.length },
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
          aura={s.aura}
          buddy={s.buddy}
          background={s.background}
          size={116}
          height={190}
        />
        <h1 className={styles.name}>{s.name}</h1>
        <span className={styles.title}>{titleName(s.title, lang)}</span>
      </section>

      <motion.button whileTap={{ scale: 0.98 }} className={`${shared.card} ${styles.weekCard}`} onClick={() => setShowStreak(true)}>
        <div className={styles.weekHead}>
          <h2 className={shared.sectionTitle}>{c.thisWeek}</h2>
          <PixelIcon name="chevronRight" size={12} className={styles.chev} />
        </div>
        <div className={styles.week}>
          {weekdays.map((d, i) => {
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

      <Button variant="secondary" full onClick={() => setShare(true)} aria-label={c.shareStreakLabel}>
        {c.shareStreak}
      </Button>

      <AnimatePresence>{showStreak && <StreakScreen onClose={() => setShowStreak(false)} />}</AnimatePresence>
      <ShareSheet
        open={share}
        onClose={() => setShare(false)}
        details={shareDetails(s, false, new Date(), lang)}
        outfit={{ outfit: s.outfit, face: s.face, neck: s.neck, back: s.back, aura: s.aura, buddy: s.buddy }}
      />

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
        <div className={shared.groupRow}>
          <span className={styles.rowLabel}>{c.language}</span>
          <div className={styles.lang} role="group" aria-label={c.language}>
            <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              <Flag code="en" /> en
            </button>
            <button type="button" aria-pressed={lang === "pl"} onClick={() => setLang("pl")}>
              <Flag code="pl" /> pl
            </button>
          </div>
        </div>
        {account.status !== "off" && (
          <button className={shared.groupRow} onClick={() => router.push("/account")}>
            <PixelIcon name="face" size={24} />
            <span className={styles.rowLabel}>{c.account}</span>
            <span className={`${styles.rowValue} ${styles.rowEmail}`}>
              {account.status === "signedIn" ? account.email : account.status === "loading" ? "" : c.signUp}
            </span>
            <PixelIcon name="chevronRight" size={12} className={styles.rowChev} />
          </button>
        )}
        <button className={shared.groupRow} onClick={() => router.push("/reminders")}>
          <PixelIcon name="bell" size={24} />
          <span className={styles.rowLabel}>{c.reminders}</span>
          <span className={styles.rowValue}>
            {s.notif.prefs.enabled ? c.on : c.off}
          </span>
          <PixelIcon name="chevronRight" size={12} className={styles.rowChev} />
        </button>
        {android && (
          <button className={shared.groupRow} onClick={() => router.push("/phone")}>
            <PixelIcon name="phone" size={24} />
            <span className={styles.rowLabel}>{c.phoneTime}</span>
            <span className={styles.rowValue}>{s.phoneTracking ? c.measured : c.setUp}</span>
            <PixelIcon name="chevronRight" size={12} className={styles.rowChev} />
          </button>
        )}
        {install.canInstall && (
          <button className={shared.groupRow} onClick={install.start}>
            <PixelIcon name="install" size={24} />
            <span className={styles.rowLabel}>{c.installApp}</span>
            <span className={styles.rowValue}>{c.homeScreen}</span>
            <PixelIcon name="chevronRight" size={12} className={styles.rowChev} />
          </button>
        )}
      </div>
      {install.ui}

      <section className={shared.card}>
        <h2 className={shared.sectionTitle}>{c.myGoal}</h2>
        <p className={styles.goalHint}>{c.goalHint}</p>
        <Segmented
          label={c.phoneLimit}
          options={PHONE_LIMIT_OPTIONS}
          value={s.phoneLimit}
          onChange={(v) => setGoals({ phoneLimit: v })}
          lang={lang}
        />
        <Segmented
          label={c.breakGoal}
          options={BREAK_GOAL_OPTIONS}
          value={s.breakGoal}
          onChange={(v) => setGoals({ breakGoal: v })}
          lang={lang}
        />
        {goalsWaitForTomorrow(s.days, s) && (
          <p className={styles.goalWait}>
            {c.goalsWait(formatMinutes(todayGoals.phoneLimit, lang), formatMinutes(todayGoals.breakGoal, lang))}
          </p>
        )}
        <div className={styles.apps}>
          <span className={styles.segLabel}>{c.appsOff}</span>
          <div className={styles.chips}>
            {s.blockedApps.map((a) => (
              <span key={a} className={styles.chip}>{a}</span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className={shared.sectionTitle}>
          {c.achievements} <span className={shared.muted}>{unlocked}/{list.length}</span>
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
              <span className={styles.badgeName}>{c.badge[a.id]?.[0] ?? a.name}</span>
              <span className={styles.badgeHint}>{c.badge[a.id]?.[1] ?? a.hint}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <Button variant="ghost" size="medium" onClick={() => setConfirmReset(true)}>
        {c.startOver}
      </Button>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)}>
        <div className={styles.resetBody}>
          <Mascot mood="sad" size={100} />
          <h2>{c.startOverAsk}</h2>
          <p className={shared.muted}>
            {account.status === "signedIn" ? c.startOverAccount : c.startOverLocal}
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
            {c.yesStartOver}
          </Button>
          <Button full variant="secondary" onClick={() => setConfirmReset(false)}>
            {c.keepProgress}
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
  lang,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
  lang: "en" | "pl";
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
            <span className={styles.segText}>{formatMinutes(o, lang)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
