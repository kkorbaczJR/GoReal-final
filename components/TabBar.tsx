"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import styles from "./TabBar.module.css";

const TABS = [
  { href: "/home", label: "Today", icon: TimerIcon },
  { href: "/shop", label: "Shop", icon: BagIcon },
  { href: "/profile", label: "You", icon: FaceIcon },
];

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className={styles.bar} aria-label="Main">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={`${styles.tab} ${active ? styles.active : ""}`}>
            {active && (
              <motion.span
                layoutId="tab-dot"
                className={styles.dot}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <Icon />
            <span className={styles.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: styles.icon,
};

function TimerIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2" />
      <path d="M10 2h4" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </svg>
  );
}

function FaceIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 4c5 0 8 3.5 8 8s-3.5 8-8 8-8-3.5-8-8 3-8 8-8Z" />
      <path d="M9 11v1M15 11v1M10 15.5c1.2.8 2.8.8 4 0" />
    </svg>
  );
}
