"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useCopy } from "@/lib/i18n";
import { PixelIcon, type PixelIconName } from "./PixelIcon";
import styles from "./TabBar.module.css";

const TABS: { href: string; key: "today" | "shop" | "you"; icon: PixelIconName }[] = [
  { href: "/home", key: "today", icon: "timer" },
  { href: "/shop", key: "shop", icon: "bag" },
  { href: "/profile", key: "you", icon: "face" },
];

export default function TabBar() {
  const pathname = usePathname();
  const { c } = useCopy();
  const label = { today: c.today, shop: c.shop, you: c.you };
  return (
    <nav className={styles.bar} aria-label={c.nav}>
      {TABS.map(({ href, key, icon }) => {
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
            <motion.span
              className={styles.icon}
              animate={active ? { y: [0, -3, 0] } : { y: 0 }}
              transition={{ duration: 0.3, ease: (t: number) => Math.round(t * 3) / 3 }}
            >
              <PixelIcon name={icon} size={24} />
            </motion.span>
            <span className={styles.label}>{label[key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
