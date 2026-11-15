"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCopy } from "@/lib/i18n";
import { formatWhen } from "@/lib/notifications/types";
import { clearInbox, markInboxRead, useGoReal } from "@/lib/store";
import Button from "./Button";
import Mascot from "./Mascot";
import NotificationCard from "./NotificationCard";
import styles from "./NotificationBell.module.css";
import { PixelIcon } from "./PixelIcon";
import Sheet from "./Sheet";

/** Bell with an orange dot when something is unread. Opens the inbox. */
export default function NotificationBell() {
  const s = useGoReal()!;
  const { lang, c } = useCopy();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(0);

  const inbox = s.notif.inbox;
  const unread = inbox.filter((i) => !i.read).length;

  return (
    <>
      <button
        className={styles.bell}
        aria-label={unread > 0 ? c.unread(unread) : c.notifications}
        onClick={() => {
          setNow(Date.now());
          setOpen(true);
        }}
      >
        <PixelIcon name="bell" size={24} />
        {unread > 0 && <span className={styles.dot} />}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className={styles.head}>
          <h2>{c.notifications}</h2>
          {inbox.length > 0 && (
            <div className={styles.actions}>
              <Button variant="ghost" size="small" onClick={markInboxRead} disabled={unread === 0}>
                {c.markRead}
              </Button>
              <Button variant="ghost" size="small" onClick={clearInbox}>
                {c.clear}
              </Button>
            </div>
          )}
        </div>

        {inbox.length === 0 ? (
          <div className={styles.empty}>
            <Mascot mood="sleeping" size={110} />
            <strong>{c.nothingYet}</strong>
            <p>{c.nothingYetBody}</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {inbox.map((i) => (
              <li key={i.id}>
                <NotificationCard
                  kind={i.kind}
                  title={i.title}
                  body={i.body}
                  time={formatWhen(i.at, now, lang)}
                  unread={!i.read}
                />
              </li>
            ))}
          </ul>
        )}

        <button
          className={styles.settings}
          onClick={() => {
            setOpen(false);
            router.push("/reminders");
          }}
        >
          <span>{c.reminderSettings}</span>
          <PixelIcon name="chevronRight" size={12} />
        </button>
      </Sheet>
    </>
  );
}
