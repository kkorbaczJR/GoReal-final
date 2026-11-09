"use client";

import { motion } from "framer-motion";
import styles from "./Switch.module.css";

/** iOS-style on/off switch. */
export default function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`${styles.track} ${checked ? styles.on : ""}`}
      onClick={() => onChange(!checked)}
    >
      <motion.span
        className={styles.thumb}
        initial={false}
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 600, damping: 34 }}
      />
    </button>
  );
}
