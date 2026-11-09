"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(0);

  const inbox = s.notif.inbox;
  const unread = inbox.filter((i) => !i.read).length;

  return (
    <>
      <button
        className={styles.bell}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
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
          <h2>Notifications</h2>
          {inbox.length > 0 && (
            <div className={styles.actions}>
              <Button variant="ghost" size="small" onClick={markInboxRead} disabled={unread === 0}>
                Mark all read
              </Button>
              <Button variant="ghost" size="small" onClick={clearInbox}>
                Clear
              </Button>
            </div>
          )}
        </div>

        {inbox.length === 0 ? (
          <div className={styles.empty}>
            <Mascot mood="sleeping" size={110} />
            <strong>Nothing yet</strong>
            <p>Rilo will tell you here about your streak, finished breaks and the shop.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {inbox.map((i) => (
              <li key={i.id}>
                <NotificationCard
                  kind={i.kind}
                  title={i.title}
                  body={i.body}
                  time={formatWhen(i.at, now)}
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
          <span>Reminder settings</span>
          <PixelIcon name="chevronRight" size={12} />
        </button>
      </Sheet>
    </>
  );
}
