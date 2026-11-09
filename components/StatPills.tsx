"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PixelIcon } from "./PixelIcon";
import styles from "./StatPills.module.css";

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

export default function StatPills({
  streak,
  streakLit,
  coins,
  onStreakClick,
}: {
  streak: number;
  streakLit: boolean;
  coins: number;
  onStreakClick?: () => void;
}) {
  return (
    <div className={styles.row}>
      <motion.button
        key={`s${streak}`}
        {...bump}
        whileTap={{ scale: 0.92 }}
        className={styles.pill}
        onClick={onStreakClick}
        aria-label={`${streak} day streak. Open streak`}
      >
        <PixelIcon name="flame" size={24} dim={!streakLit} />
        <AnimatedNumber value={streak} />
      </motion.button>
      <motion.div key={`c${coins}`} {...bump} className={styles.pill} aria-label={`${coins} coins`}>
        <PixelIcon name="coin" size={24} />
        <AnimatedNumber value={coins} />
      </motion.div>
    </div>
  );
}
