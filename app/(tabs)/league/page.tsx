"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useEffect, useState } from "react";
import Button from "@/components/Button";
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
            <Mascot mood={moved > 0 ? "proud" : moved < 0 ? "sad" : "happy"} size={90} outfit={s.outfit} />
            <div className={styles.resultText}>
              <b>Last week you finished #{lastResult.rank}</b>
              <span>
                {moved > 0
                  ? `You moved up to ${TIERS[lastResult.toTier].name}!`
                  : moved < 0
                    ? `You dropped to ${TIERS[lastResult.toTier].name}. You can climb back!`
                    : `You stay in ${TIERS[lastResult.toTier].name}.`}
              </span>
              <Button size="small" onClick={markLeagueResultSeen}>
                Got it
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className={styles.tiers}>
        {TIERS.map((t, i) => (
          <motion.div
            key={t.name}
            className={styles.tier}
            animate={{ scale: i === tier ? 1 : 0.78, opacity: i === tier ? 1 : 0.9 }}
          >
            <TierBadge tier={i} size={i === tier ? 64 : 44} locked={i > tier} />
            {i === tier && <span className={styles.tierName}>{t.name}</span>}
          </motion.div>
        ))}
      </section>

      <p className={styles.explain}>
        {myZone === "up"
          ? `You're in the top ${MOVE_COUNT}. Keep it up to move to ${TIERS[tier + 1].name}!`
          : myZone === "down"
            ? `Bottom ${MOVE_COUNT} drop down. Take a break to climb!`
            : canGoUp
              ? `Top ${MOVE_COUNT} move up to ${TIERS[tier + 1].name} on Monday. 1 break minute = 1 XP.`
              : "You're in the top league. Stay in it!"}
      </p>

      <ol className={styles.table}>
        {table.map((p, i) => {
          const rank = i + 1;
          return (
            <Fragment key={p.id}>
              {rank === MOVE_COUNT + 1 && canGoUp && <Divider label="Promotion zone" up />}
              {rank === LEAGUE_SIZE - MOVE_COUNT + 1 && canGoDown && <Divider label="Demotion zone" />}
              <motion.li layout className={`${styles.row} ${p.isYou ? styles.you : ""}`}>
                <span className={`${styles.rank} ${rank <= 3 ? styles.podium : ""}`}>{rank}</span>
                <span className={styles.avatar}>{p.name[0].toUpperCase()}</span>
                <span className={styles.name}>{p.isYou ? `${p.name} (you)` : p.name}</span>
                <span className={styles.xp}>{p.xp} XP</span>
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
      <span>{up ? "▲" : "▼"} {label}</span>
    </li>
  );
}
