"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useEffect, useState } from "react";
import Button from "@/components/Button";
import CountUp from "@/components/CountUp";
import Mascot from "@/components/Mascot";
import TierBadge from "@/components/TierBadge";
import {
  LEAGUE_SIZE,
  MOVE_COUNT,
  TIERS,
  msUntilWeekEnds,
  standings,
  weekProgress,
  weekXp,
  zoneForRank,
} from "@/lib/league";
import { markLeagueResultSeen, useGoReal } from "@/lib/store";
import shared from "../tabs.module.css";
import styles from "./league.module.css";

function timeLeft(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ${h % 24}h left`;
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m left`;
}

export default function League() {
  const s = useGoReal()!;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { tier, weekKey, lastResult } = s.league;
  const myXp = weekXp(s.days, weekKey);
  const table = standings(weekKey, tier, { name: s.name, xp: myXp }, weekProgress(now));
  const myRank = table.findIndex((p) => p.isYou) + 1;
  const myZone = zoneForRank(myRank, tier);
  const canGoUp = tier < TIERS.length - 1;
  const canGoDown = tier > 0;

  const showResult = lastResult && !lastResult.seen;
  const moved = lastResult ? Math.sign(lastResult.toTier - lastResult.fromTier) : 0;

  return (
    <main className={shared.page}>
      <div className={shared.top}>
        <h1 className={shared.heading}>League</h1>
        <span className={styles.timeLeft}>{timeLeft(msUntilWeekEnds(now))}</span>
      </div>

      <AnimatePresence>
        {showResult && lastResult && (
          <motion.section
            className={styles.result}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, height: 0, padding: 0, margin: 0 }}
          >
            <Mascot mood={moved > 0 ? "proud" : moved < 0 ? "sad" : "happy"} size={76} outfit={s.outfit} still />
            <div className={styles.resultText}>
              <b>Last week you finished #{lastResult.rank}</b>
              <span>
                {moved > 0
                  ? `You moved up to ${TIERS[lastResult.toTier].name}!`
                  : moved < 0
                    ? `You dropped to ${TIERS[lastResult.toTier].name}. You can climb back!`
                    : `You stay in ${TIERS[lastResult.toTier].name}.`}
              </span>
              <Button size="small" variant="secondary" onClick={markLeagueResultSeen}>
                Got it
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className={styles.tierCard}>
        <div className={styles.tiers}>
          {TIERS.map((t, i) => (
            <motion.div key={t.name} animate={{ scale: i === tier ? 1 : 0.9 }}>
              <TierBadge tier={i} size={i === tier ? 52 : 30} locked={i > tier} current={i === tier} />
            </motion.div>
          ))}
        </div>
        <h2 className={styles.tierName}>{TIERS[tier].name} league</h2>
        <p className={styles.explain}>
          {myZone === "up"
            ? `You're in the top ${MOVE_COUNT}. Hold on to move up to ${TIERS[tier + 1].name}.`
            : myZone === "down"
              ? `The bottom ${MOVE_COUNT} move down on Monday. A break or two will lift you.`
              : canGoUp
                ? `Top ${MOVE_COUNT} move up to ${TIERS[tier + 1].name} on Monday. One break minute is one XP.`
                : "This is the top league. Stay in it."}
        </p>
      </section>

      <ol className={styles.table}>
        {table.map((p, i) => {
          const rank = i + 1;
          return (
            <Fragment key={p.id}>
              {rank === MOVE_COUNT + 1 && canGoUp && <Divider label="Promotion zone" up />}
              {rank === LEAGUE_SIZE - MOVE_COUNT + 1 && canGoDown && <Divider label="Demotion zone" />}
              <motion.li
                layout
                className={`${styles.row} ${p.isYou ? styles.you : ""}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.32, ease: [0.2, 0, 0, 1] }}
              >
                <span className={`${styles.rank} ${rank <= 3 ? styles.podium : ""}`}>{rank}</span>
                <span className={styles.avatar}>{p.name[0].toUpperCase()}</span>
                <span className={styles.name}>{p.isYou ? `${p.name} (you)` : p.name}</span>
                <span className={styles.xp}>
                  <CountUp to={p.xp} duration={1000} delay={0.04 * i * 1000} /> XP
                </span>
              </motion.li>
            </Fragment>
          );
        })}
      </ol>
    </main>
  );
}

function Divider({ label, up = false }: { label: string; up?: boolean }) {
  return (
    <li className={`${styles.divider} ${up ? styles.dividerUp : ""}`} aria-hidden>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden style={{ transform: up ? undefined : "rotate(180deg)" }}>
        <path d="M5 2 L9 8 H1 Z" fill="currentColor" />
      </svg>
      <span>{label}</span>
    </li>
  );
}
