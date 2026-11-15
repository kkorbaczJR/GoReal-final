"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { onBack } from "@/lib/back";
import { awayOutcome, isPhoneBrowser } from "@/lib/breakLeave";
import { hideBreakLock, showBreakLock } from "@/lib/breakLock";
import { formatClock } from "@/lib/date";
import { useCopy } from "@/lib/i18n";
import { minutesLeft } from "@/lib/lang";
import { canMeasure, leftDuringBreak } from "@/lib/phone";
import { LEAVE_GRACE_SECONDS, rewardForBreak } from "@/lib/rules";
import { isWatchingScreen, noteScreenHidden, subscribeScreen, unlockedHiddenSeconds } from "@/lib/screenLock";
import { ACCENT_COLORS } from "@/lib/shop";
import { shareDetails } from "@/lib/shareStreak";
import { finishBreak, quitBreak, type GoRealState } from "@/lib/store";
import CountUp from "./CountUp";
import Button from "./Button";
import Mascot from "./Mascot";
import { PixelIcon } from "./PixelIcon";
import ShareSheet from "./ShareSheet";
import StreakScreen from "./StreakScreen";
import TimerRing from "./TimerRing";
import styles from "./BreakOverlay.module.css";

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
  const [share, setShare] = useState(false);
  const hiddenAt = useRef<number | null>(null);
  const ended = useRef(false);
  // On Android, don't award the break until we know another app wasn't opened. The web already knows.
  const [ready, setReady] = useState(!canMeasure());
  const { lang, c } = useCopy();
  const [seesScreen, setSeesScreen] = useState(isWatchingScreen);

  const end = (next: Outcome) => {
    if (ended.current) return;
    ended.current = true;
    void hideBreakLock();
    setOutcome(next);
  };

  // Back does nothing here: a break ends with its own buttons, not by accident.
  useEffect(() => onBack(() => {}), []);

  const endsAt = brk ? brk.startedAt + brk.minutes * 60_000 : 0;
  const totalMs = brk ? brk.minutes * 60_000 : 1;
  const leftMs = Math.max(0, endsAt - now);

  const complete = useCallback(() => {
    if (!brk || ended.current) return;
    const minutes = brk.minutes;
    const coins = rewardForBreak(minutes, true).coins;
    ended.current = true;
    void hideBreakLock();
    finishBreak();
    setDayJustCounted(!streakDoneBefore && streakDoneAfter());
    setOutcome({ kind: "done", minutes, coins });
  }, [brk, streakDoneBefore, streakDoneAfter]);

  const failLeft = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    void hideBreakLock();
    quitBreak();
    setOutcome({ kind: "quit", reason: "left" });
  }, []);

  // Tick the clock and finish when time is up. Coins are computed here so a second tick, or the store
  // already having cleared the break, cannot show "+0". While the phone is off the clock sleeps, and
  // this catches up as soon as the screen is back.
  useEffect(() => {
    if (outcome.kind !== "running" || !brk || !ready) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt && hiddenAt.current === null) complete();
    }, 250);
    return () => clearInterval(id);
  }, [outcome.kind, brk, endsAt, ready, complete]);

  // Opening the app again after the phone was off: finish a break whose time already ran out,
  // unless another app was used (Android, when usage access is on).
  useEffect(() => {
    if (outcome.kind !== "running" || !brk || !canMeasure()) return;
    let cancel = false;
    leftDuringBreak(brk.startedAt).then((native) => {
      if (cancel || ended.current) return;
      const away = (Date.now() - brk.startedAt) / 1000;
      if (awayOutcome({ awaySeconds: away, graceSeconds: LEAVE_GRACE_SECONDS, native, cameBack: false, phoneBrowser: false }) === "left") {
        failLeft();
        return;
      }
      setReady(true);
      if (Date.now() >= endsAt) complete();
    });
    return () => {
      cancel = true;
    };
  }, [outcome.kind, brk, endsAt, complete, failLeft]);

  // The screen may turn off. That is not leaving. Opening another app is.
  // On a computer, hiding the tab still is. The Android app asks the phone which app was in front.
  useEffect(() => {
    if (outcome.kind !== "running" || !brk) return;
    let graceTimer = 0;
    const decide = (since: number) => {
      const away = (Date.now() - since) / 1000;
      const phoneBrowser = isPhoneBrowser() && !canMeasure();
      void (async () => {
        const native = canMeasure() ? await leftDuringBreak(since) : null;
        if (ended.current) return;
        const look = () =>
          awayOutcome({
            awaySeconds: (Date.now() - since) / 1000,
            graceSeconds: LEAVE_GRACE_SECONDS,
            native,
            cameBack: true,
            phoneBrowser,
            canSeeScreen: phoneBrowser && isWatchingScreen(),
            unlockedSeconds: phoneBrowser ? unlockedHiddenSeconds() : 0,
          });
        if (look() === "left") {
          failLeft();
          return;
        }
        // Usage events can arrive a moment after the app switch. Ask once more before paying the coins.
        if (native?.known && !native.left && away > LEAVE_GRACE_SECONDS) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          if (ended.current) return;
          const again = await leftDuringBreak(since);
          if (again.known && again.left) {
            failLeft();
            return;
          }
        }
        if (document.visibilityState === "visible" && Date.now() >= endsAt) complete();
      })();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        noteScreenHidden();
        const left = Math.max(1, Math.ceil((endsAt - Date.now()) / 60_000));
        void showBreakLock({
          endAt: endsAt,
          title: c.lockTitle,
          subtitle: c.lockLeft,
          body: minutesLeft(lang, left),
          color: ACCENT_COLORS[state.accent].accent,
        });
        window.clearTimeout(graceTimer);
        graceTimer = window.setTimeout(() => {
          if (hiddenAt.current === null) return;
          decide(hiddenAt.current);
        }, LEAVE_GRACE_SECONDS * 1000);
        return;
      }
      const since = hiddenAt.current;
      hiddenAt.current = null;
      window.clearTimeout(graceTimer);
      if (since === null) return;
      decide(since);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(graceTimer);
    };
  }, [outcome.kind, brk, endsAt, complete, failLeft, c.lockTitle, c.lockLeft, lang, state.accent]);

  // Another window ended it. Skip if this window just finished it (finishBreak clears the store first).
  useEffect(() => {
    if (ended.current || outcome.kind !== "running") return;
    if (!state.activeBreak) end({ kind: "quit", reason: "elsewhere" });
  }, [state.activeBreak, outcome.kind]);

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % c.tips.length), 12_000);
    return () => clearInterval(id);
  }, [c.tips.length]);

  useEffect(() => subscribeScreen(() => setSeesScreen(isWatchingScreen())), []);

  // Lock-screen card: Rilo and the minutes left. The screen itself is allowed to turn off.
  // The words are the minutes remaining, never the clock time the break ends.
  useEffect(() => {
    if (outcome.kind !== "running" || !brk) return;
    const endAt = brk.startedAt + brk.minutes * 60_000;
    const push = () => {
      const left = Math.max(1, Math.ceil((endAt - Date.now()) / 60_000));
      void showBreakLock({
        endAt,
        title: c.lockTitle,
        subtitle: c.lockLeft,
        body: minutesLeft(lang, left),
        color: ACCENT_COLORS[state.accent].accent,
      });
    };
    push();
    const id = window.setInterval(push, 30_000);
    return () => window.clearInterval(id);
  }, [outcome.kind, brk, c.lockTitle, c.lockLeft, lang, state.accent]);

  // Hold-to-give-up so it never happens by accident.
  useEffect(() => {
    if (!hold) return;
    const id = setTimeout(() => {
      ended.current = true;
      void hideBreakLock();
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
              <span>{c.breakMode}</span>
            </div>

            <div className={styles.center}>
              <TimerRing
                progress={1 - leftMs / totalMs}
                size={280}
                stroke={6}
                track="rgba(255, 255, 255,0.1)"
              >
                <Mascot mood="sleeping" size={124} onDark outfit={state.outfit} face={state.face} neck={state.neck} back={state.back} aura={state.aura} buddy={state.buddy} />
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
                  {c.tips[tip % c.tips.length]}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className={styles.blocked}>
              <p className={styles.blockedTitle}>{c.offLimits}</p>
              <div className={styles.chips}>
                {state.blockedApps.map((a) => (
                  <span key={a} className={styles.chip}>
                    <PixelIcon name="lock" size={12} />
                    {a}
                  </span>
                ))}
              </div>
              <p className={styles.warning}>
                {canMeasure() || (isPhoneBrowser() && seesScreen) ? c.warnAndroid : isPhoneBrowser() ? c.warnPhone : c.warnDesktop}
              </p>
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
              <span className={styles.giveUpText}>{c.giveUp}</span>
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
              <Mascot mood="proud" size={170} outfit={state.outfit} face={state.face} neck={state.neck} back={state.back} aura={state.aura} buddy={state.buddy} />
              <h1 className={styles.resultTitle}>{c.youDidIt}</h1>
              <p className={styles.resultSub}>{c.realWorld(outcome.minutes)}</p>
              <div className={styles.rewards}>
                <RewardPill delay={0.2}>
                  <PixelIcon name="coin" size={24} /> +<CountUp to={outcome.coins} />
                </RewardPill>
                <RewardPill delay={0.4}>
                  <PixelIcon name="clock" size={24} /> <CountUp to={outcome.minutes} /> {c.min}
                </RewardPill>
              </div>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" full onClick={() => setShare(true)} aria-label={c.shareStreakLabel}>
                {c.share}
              </Button>
              <Button full onClick={() => (dayJustCounted ? setOutcome({ kind: "streak" }) : onClose())}>
                {c.niceBang}
              </Button>
            </div>
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
              <Mascot mood={outcome.reason === "elsewhere" ? "happy" : "sad"} size={160} outfit={state.outfit} face={state.face} neck={state.neck} back={state.back} aura={state.aura} buddy={state.buddy} />
              <h1 className={styles.resultTitle}>{outcome.reason === "elsewhere" ? c.breakOver : c.breakEarly}</h1>
              <p className={styles.resultSub}>
                {outcome.reason === "left"
                  ? c.leftApp
                  : outcome.reason === "elsewhere"
                    ? c.endedElsewhere
                    : c.noCoins}
              </p>
            </div>
            <Button full onClick={onClose}>
              {outcome.reason === "elsewhere" ? c.okay : c.tryAgain}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <ShareSheet
        open={share}
        onClose={() => setShare(false)}
        details={shareDetails(state, false, new Date(), lang)}
        outfit={{ outfit: state.outfit, face: state.face, neck: state.neck, back: state.back, aura: state.aura, buddy: state.buddy }}
      />
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
