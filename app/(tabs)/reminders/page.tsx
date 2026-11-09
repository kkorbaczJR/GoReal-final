"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Button from "@/components/Button";
import NotificationCard from "@/components/NotificationCard";
import { PixelIcon } from "@/components/PixelIcon";
import Switch from "@/components/Switch";
import { addDays, dayKey } from "@/lib/date";
import { writeCopy } from "@/lib/notifications/copy";
import { permission, requestPermission, showSystem, type NotifPermission } from "@/lib/notifications/delivery";
import { buildCtx, dayNumber, eventNotif, isQuiet, planNotifications } from "@/lib/notifications/planner";
import {
  CATEGORY_INFO,
  CATEGORY_ORDER,
  DAILY_CAP,
  MAX_INBOX,
  QUIET_OPTIONS,
  REMINDER_HOURS,
  formatClockTime,
  formatHour,
  quietLabel,
  type Notif,
  type NotifCategory,
  type NotifKind,
  type QuietHours,
} from "@/lib/notifications/types";
import { pushNotif, setNotifPrefs, useGoReal } from "@/lib/store";
import shared from "../tabs.module.css";
import styles from "./reminders.module.css";

const SAMPLE_KIND: Record<NotifCategory, NotifKind> = {
  reminders: "nudge",
  streak: "streakRisk",
  breaks: "breakEnd",
  shop: "shopTip",
  limit: "limit80",
};

const HOURS = [0, 6, 12, 18, 24];

function dayWord(at: number, nowMs: number): string {
  const diff = dayNumber(new Date(at)) - dayNumber(new Date(nowMs));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return new Date(at).toLocaleDateString("en-GB", { weekday: "short" });
}

function sameQuiet(a: QuietHours | null, b: QuietHours | null) {
  return a === b || (a !== null && b !== null && a.start === b.start && a.end === b.end);
}

export default function Reminders() {
  const s = useGoReal()!;
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [perm, setPerm] = useState<NotifPermission>(() => permission());
  const { prefs } = s.notif;
  const on = prefs.enabled;

  const plan = useMemo(() => planNotifications(s, new Date(now)), [s, now]);
  const date = new Date(now);
  const ctx = buildCtx(s, date);
  const seed = dayNumber(date);

  const sample = (kind: NotifKind) => {
    const extra =
      kind === "streakRisk"
        ? { streak: Math.max(ctx.streak, 6), remaining: ctx.goal }
        : kind === "breakEnd"
          ? { breakMinutes: 15, reward: 18 }
          : kind === "shopTip"
            ? { item: "Cat ears", price: 250, coins: Math.max(ctx.coins, 250) }
            : kind === "limit80"
              ? { used: Math.round(s.phoneLimit * 0.8), limit: s.phoneLimit, left: Math.round(s.phoneLimit * 0.2) }
              : {};
    return writeCopy(kind, { ...ctx, ...extra }, seed);
  };

  const sendTest = () => {
    const n: Notif = eventNotif(s, "nudge", {}, new Date(), `test-${Date.now()}`);
    pushNotif(n);
    if (perm === "granted") void showSystem(n);
  };

  const ask = async () => setPerm(await requestPermission());

  const preview = sample("nudge");

  return (
    <main className={shared.page}>
      <div className={shared.top}>
        <button className={styles.back} onClick={() => router.back()} aria-label="Back">
          <PixelIcon name="chevronLeft" size={18} />
          <span>Back</span>
        </button>
      </div>

      <div>
        <h1 className={shared.heading}>Reminders</h1>
        <p className={shared.lede}>Short, kind and never more than {DAILY_CAP} a day.</p>
      </div>

      <section className={styles.phone} aria-label="How it looks">
        <span className={styles.phoneLabel}>How it looks</span>
        <NotificationCard kind="nudge" title={preview.title} body={preview.body} time="now" />
      </section>

      <div className={shared.group}>
        <div className={shared.groupRow}>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Notifications</span>
            <span className={styles.rowHint}>{on ? "On" : "Off. Nothing is planned or shown."}</span>
          </div>
          <Switch label="Notifications" checked={on} onChange={(enabled) => setNotifPrefs({ enabled })} />
        </div>
        <div className={shared.groupRow}>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>On your phone</span>
            <span className={styles.rowHint}>
              {perm === "granted" && "Allowed. You get them when GoReal is in the background."}
              {perm === "default" && "Allow notifications to see them when GoReal is not on screen."}
              {perm === "denied" && "Blocked in your browser settings. Turn them on there to allow."}
              {perm === "unsupported" && "This browser cannot show them. You still get banners inside GoReal."}
            </span>
          </div>
          {perm === "default" && (
            <Button size="small" variant="accent" onClick={ask}>
              Allow
            </Button>
          )}
          {perm === "granted" && <PixelIcon name="check" size={22} />}
        </div>
      </div>
      <p className={styles.note}>
        Right now GoReal can only notify you while it is open or in the background. Reminders that arrive when the app
        is fully closed come with the phone app.
      </p>

      <section className={on ? undefined : styles.off}>
        <h2 className={shared.sectionTitle}>Next 48 hours</h2>
        <div className={shared.card}>
          {[0, 1].map((offset) => {
            const key = dayKey(addDays(date, offset));
            const items = plan.filter((n) => dayKey(new Date(n.at)) === key);
            return (
              <div key={key} className={styles.dayRow}>
                <span className={styles.dayName}>{offset === 0 ? "Today" : "Tomorrow"}</span>
                <Timeline
                  quiet={prefs.quiet}
                  at={items.map((n) => ({ id: n.id, ms: n.at, ready: true }))}
                  nowMs={offset === 0 ? now : null}
                  dayStart={new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset).getTime()}
                />
              </div>
            );
          })}
          <div className={styles.axis} aria-hidden>
            {HOURS.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>

          {plan.length === 0 ? (
            <p className={styles.empty}>Nothing planned. Rilo will stay quiet.</p>
          ) : (
            <ul className={styles.plan}>
              {plan.map((n) => (
                <li key={n.id} className={styles.planItem}>
                  <span className={styles.when}>
                    <b>{formatClockTime(n.at)}</b>
                    <small>{dayWord(n.at, now)}</small>
                  </span>
                  <span className={styles.what}>
                    <span>{n.title}</span>
                    <small>{n.body}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {prefs.quiet && (
            <p className={styles.legend}>
              <span className={styles.swatch} /> Quiet hours, {quietLabel(prefs.quiet)}
            </p>
          )}
        </div>
      </section>

      <section className={on ? undefined : styles.off}>
        <h2 className={shared.sectionTitle}>What you get</h2>
        <div className={styles.cats}>
          {CATEGORY_ORDER.map((cat) => {
            const info = CATEGORY_INFO[cat];
            const kind = SAMPLE_KIND[cat];
            const text = sample(kind);
            const soon = cat === "limit";
            return (
              <div key={cat} className={styles.cat}>
                <div className={styles.catHead}>
                  <div className={styles.rowText}>
                    <span className={styles.rowTitle}>
                      {info.label}
                      {soon && <span className={styles.soon}>Coming with Android tracking</span>}
                    </span>
                    <span className={styles.rowHint}>{info.hint}</span>
                  </div>
                  <Switch
                    label={info.label}
                    checked={prefs.categories[cat]}
                    disabled={!on}
                    onChange={(value) => setNotifPrefs({ categories: { [cat]: value } })}
                  />
                </div>
                <div className={prefs.categories[cat] ? undefined : styles.dim}>
                  <NotificationCard kind={kind} title={text.title} body={text.body} time="example" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={on ? undefined : styles.off}>
        <h2 className={shared.sectionTitle}>Daily reminder time</h2>
        <div className={styles.chips} role="radiogroup" aria-label="Daily reminder time">
          {REMINDER_HOURS.map((h) => (
            <Chip key={h} active={prefs.reminderHour === h} onClick={() => setNotifPrefs({ reminderHour: h })}>
              {formatHour(h)}
            </Chip>
          ))}
        </div>

        <h2 className={shared.sectionTitle} style={{ marginTop: 22 }}>
          Quiet hours
        </h2>
        <p className={styles.rowHint} style={{ marginBottom: 10 }}>
          Nothing appears then. Streak warnings are skipped, other reminders wait until it is over.
        </p>
        <div className={styles.chips} role="radiogroup" aria-label="Quiet hours">
          {QUIET_OPTIONS.map((q) => (
            <Chip key={quietLabel(q)} active={sameQuiet(prefs.quiet, q)} onClick={() => setNotifPrefs({ quiet: q })}>
              {quietLabel(q)}
            </Chip>
          ))}
        </div>
        {prefs.quiet && isQuiet(prefs.quiet, now) && <p className={styles.rowHint}>Quiet hours are on right now.</p>}
      </section>

      <div className={styles.test}>
        <Button full variant="secondary" onClick={sendTest} disabled={!on}>
          Send a test notification
        </Button>
        <p className={styles.rowHint}>
          Shows a banner here{perm === "granted" ? " and a notification on your phone" : ""}. The last {MAX_INBOX} are
          kept in the bell on Today.
        </p>
      </div>
    </main>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="radio" aria-checked={active} className={`${styles.chip} ${active ? styles.chipOn : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

/** One day as a 24 hour bar: quiet hours as a grey band, notifications as orange dots. */
function Timeline({
  quiet,
  at,
  nowMs,
  dayStart,
}: {
  quiet: QuietHours | null;
  at: { id: string; ms: number }[];
  nowMs: number | null;
  dayStart: number;
}) {
  const pct = (ms: number) => Math.min(100, Math.max(0, ((ms - dayStart) / 86_400_000) * 100));
  const bands: [number, number][] = !quiet || quiet.start === quiet.end
    ? []
    : quiet.start > quiet.end
      ? [[0, quiet.end], [quiet.start, 24]]
      : [[quiet.start, quiet.end]];
  return (
    <div className={styles.bar}>
      {bands.map(([a, b]) => (
        <span key={a} className={styles.band} style={{ left: `${(a / 24) * 100}%`, width: `${((b - a) / 24) * 100}%` }} />
      ))}
      {nowMs !== null && <span className={styles.now} style={{ left: `${pct(nowMs)}%` }} />}
      {at.map((d, i) => (
        <motion.span
          key={d.id}
          className={styles.pin}
          style={{ left: `${pct(d.ms)}%` }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.05 * i, type: "spring", stiffness: 500, damping: 24 }}
        />
      ))}
    </div>
  );
}
