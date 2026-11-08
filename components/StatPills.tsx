"use client";

import { AnimatePresence, motion } from "framer-motion";
import styles from "./StatPills.module.css";

export function FlameIcon({ lit = true, size = 18 }: { lit?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2c1 3.5 5.5 6 5.5 11.5A5.5 5.5 0 0 1 12 19a5.5 5.5 0 0 1-5.5-5.5c0-2.6 1.4-4.2 2.6-5.4.2 1.7 1 2.9 2.2 3.4C11 9 11 5.5 12 2Z"
        transform="translate(0 2)"
        fill={lit ? "#fc4c02" : "#d4d4d4"}
      />
    </svg>
  );
}

export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="#111111" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.5" fill="#fc4c02" />
    </svg>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  return (
    <span className={styles.num}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 14, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const bump = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.18, 1] },
  transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as const },
};

export default function StatPills({ streak, streakLit, coins }: { streak: number; streakLit: boolean; coins: number }) {
  return (
    <div className={styles.row}>
      <motion.div key={`s${streak}`} {...bump} className={styles.pill} aria-label={`${streak} day streak`}>
        <FlameIcon lit={streakLit} />
        <AnimatedNumber value={streak} />
      </motion.div>
      <motion.div key={`c${coins}`} {...bump} className={styles.pill} aria-label={`${coins} coins`}>
        <CoinIcon />
        <AnimatedNumber value={coins} />
      </motion.div>
    </div>
  );
}
