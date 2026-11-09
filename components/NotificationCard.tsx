"use client";

import type { ReactNode } from "react";
import Mascot, { type Mood } from "./Mascot";
import styles from "./NotificationCard.module.css";
import type { NotifKind } from "@/lib/notifications/types";

const MOODS: Record<NotifKind, Mood> = {
  nudge: "tired",
  comeback: "sad",
  streakRisk: "sad",
  lastCall: "sad",
  breakEnd: "proud",
  shopTip: "happy",
  freezeTip: "happy",
  freezeUsed: "proud",
  streakLost: "sad",
  milestone: "proud",
  limit80: "tired",
  limit100: "sad",
  blockedApp: "wave",
};

/** A notification drawn like the ones on a phone: app icon, name, time, title and text. */
export default function NotificationCard({
  kind,
  title,
  body,
  time,
  unread = false,
  onClick,
  trailing,
}: {
  kind: NotifKind;
  title: string;
  body: string;
  /** Text on the right of the app name, like "now" or "17:00". */
  time: string;
  unread?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      <span className={styles.icon}>
        <Mascot mood={MOODS[kind]} size={44} still />
      </span>
      <span className={styles.text}>
        <span className={styles.meta}>
          <span className={styles.app}>GOREAL</span>
          <span className={styles.time}>
            {unread && <span className={styles.dot} role="img" aria-label="Unread" />}
            {time}
          </span>
        </span>
        <span className={styles.title}>{title}</span>
        <span className={styles.body}>{body}</span>
      </span>
      {trailing}
    </>
  );
  return onClick ? (
    <button className={styles.card} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={styles.card}>{content}</div>
  );
}
