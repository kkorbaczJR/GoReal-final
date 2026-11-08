"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import styles from "./Button.module.css";

type Props = HTMLMotionProps<"button"> & {
  variant?: "primary" | "secondary" | "accent" | "ghost" | "light";
  size?: "large" | "medium" | "small";
  full?: boolean;
};

export default function Button({ variant = "primary", size = "large", full = false, className, ...rest }: Props) {
  return (
    <motion.button
      whileTap={rest.disabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={[styles.button, styles[variant], styles[size], full ? styles.full : "", className ?? ""].join(" ")}
      {...rest}
    />
  );
}
