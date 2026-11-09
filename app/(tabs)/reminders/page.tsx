"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Button from "@/components/Button";
import NotificationCard from "@/components/NotificationCard";
import { PixelIcon } from "@/components/PixelIcon";
import Switch from "@/components/Switch";
import { addDays, dayKey, formatMinutes } from "@/lib/date";
import { writeCopy } from "@/lib/notifications/copy";
import { permission, requestPermission, showSystem, type NotifPermission } from "@/lib/notifications/delivery";
import {
  LIMIT_WARNING_SHARE,
  RISK_FROM_HOUR,
  RISK_SESSION_MINUTES,
  buildCtx,
  dayNumber,
  eventNotif,
  simulateDay,
  usageTriggers,
} from "@/lib/notifications/triggers";
import {
  CATEGORY_INFO,
  CATEGORY_ORDER,
  DAILY_CAP,
  MAX_INBOX,
  MIN_GAP_MINUTES,
  QUIET_OPTIONS,
  SESSION_OPTIONS,
  formatClockTime,
  quietLabel,
  type Notif,
  type NotifCategory,
  type NotifKind,
  type QuietHours,
} from "@/lib/notifications/types";
import { pushNotif, setNotifPrefs, useGoReal, type GoRealState } from "@/lib/store";
import type { UsageInterval } from "@/lib/usage";
import shared from "../tabs.module.css";
import styles from "./reminders.module.css";

const SAMPLE_KIND: Record<NotifCategory, NotifKind> = {
  usage: "longSession",
  limit: "limit80",
  streak: "streakRisk",
  breaks: "breakEnd",
  shop: "shopTip",
};

/** The example day: when the phone is in use, as [start hour, start minute, minutes]. */
const EXAMPLE_DAY: [number, number, number][] = [
  [7, 40, 15],
  [12, 10, 25],
  [16, 0, 70],
  [19, 0, 20],
  [21, 5, 35],
];
const EXAMPLE_STREAK = 4;
const CHART_FROM = 6;
const CHART_TO = 24;
/** Pins closer than this (percent of the chart width) go on a row above. */
const PIN_SPACING = 8;

function sameQuiet(a: QuietHours | null, b: QuietHours | null) {
  return a === b || (a !== null && b !== null && a.start === b.start && a.end === b.end);
}

/** Your settings and goals, with a made-up history: a streak of a few days and no break yet today. */
function exampleState(s: GoRealState, day: Date): GoRealState {
  const goal = { phoneLimit: s.phoneLimit, breakGoal: s.breakGoal };
  const days: GoRealState["days"] = { [dayKey(day)]: { breakMinutes: 0, goal } };
  for (let i = 1; i <= EXAMPLE_STREAK; i++) days[dayKey(addDays(day, -i))] = { breakMinutes: s.breakGoal, goal };
  return { ...s, days, freezes: 0, activeBreak: null, notif: { ...s.notif, inbox: [], sent: [], recent: [] } };
}

export default function Reminders() {
  const s = useGoReal()!;
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [perm, setPerm] = useState<NotifPermission>(() => permission());
  const { prefs } = s.notif;
  const on = prefs.enabled;

  const date = new Date(now);
  const ctx = buildCtx(s, date);
  const seed = dayNumber(date);

  const sample = (kind: NotifKind) => {
    const limit = s.phoneLimit;
    const extra =
      kind === "longSession"
        ? { session: prefs.sessionMinutes, step: 1 }
        : kind === "streakRisk"
          ? { streak: Math.max(ctx.streak, 6), remaining: ctx.goal, done: false }
          : kind === "breakEnd"
            ? { breakMinutes: 15, reward: 18 }
            : kind === "shopTip"
              ? { item: "Cat ears", price: 250, coins: Math.max(ctx.coins, 250) }
              : kind === "limit80"
                ? {
                    used: formatMinutes(Math.round(limit * LIMIT_WARNING_SHARE)),
                    limit: formatMinutes(limit),
                    left: formatMinutes(Math.round(limit * (1 - LIMIT_WARNING_SHARE))),
                  }
                : {};
    return writeCopy(kind, { ...ctx, ...extra }, seed);
  };

  const sendTest = () => {
    const text = sample("longSession");
    const at = new Date();
    const n: Notif = { ...eventNotif(s, "longSession", {}, at, `test-${at.getTime()}`), ...text };
    pushNotif(n);
    if (perm === "granted") void showSystem(n);
  };

  const ask = async () => setPerm(await requestPermission());
  const preview = sample("longSession");

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
        <p className={shared.lede}>
          No alarms at set times. Rilo only speaks up when something happens, like a long scroll or getting close to
          your limit.
        </p>
      </div>

      <section className={styles.phone} aria-label="How it looks">
        <span className={styles.phoneLabel}>How it looks</span>
        <NotificationCard kind="longSession" title={preview.title} body={preview.body} time="now" />
      </section>

      <div className={shared.group}>
        <div className={shared.groupRow}>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Notifications</span>
            <span className={styles.rowHint}>{on ? "On" : "Off. Rilo stays quiet."}</span>
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
        Live phone use (long sessions, off-limits apps) comes with the Android app, which can see how you use your
        phone. Until then GoReal reacts to your breaks and to the phone time you log.
      </p>

      <ExampleDay s={s} on={on} />

      <Simulator s={s} on={on} />

      <section className={on ? undefined : styles.off}>
        <h2 className={shared.sectionTitle}>What you get</h2>
        <div className={styles.cats}>
          {CATEGORY_ORDER.map((cat) => {
            const info = CATEGORY_INFO[cat];
            const kind = SAMPLE_KIND[cat];
            const text = sample(kind);
            const needsAndroid = cat === "usage";
            return (
              <div key={cat} className={styles.cat}>
                <div className={styles.catHead}>
                  <div className={styles.rowText}>
                    <span className={styles.rowTitle}>
                      {info.label}
                      {needsAndroid && <span className={styles.soon}>Android app</span>}
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
        <h2 className={shared.sectionTitle}>Long session</h2>
        <p className={styles.rowHint} style={{ marginBottom: 10 }}>
          Rilo speaks up after this long on your phone without a pause, and again at twice and three times as long.
        </p>
        <div className={styles.chips} role="radiogroup" aria-label="Long session">
          {SESSION_OPTIONS.map((m) => (
            <Chip key={m} active={prefs.sessionMinutes === m} onClick={() => setNotifPrefs({ sessionMinutes: m })}>
              {m} min
            </Chip>
          ))}
        </div>

        <h2 className={shared.sectionTitle} style={{ marginTop: 22 }}>
          Quiet hours
        </h2>
        <p className={styles.rowHint} style={{ marginBottom: 10 }}>
          Nothing buzzes then, except if you open an off-limits app during a break.
        </p>
        <div className={styles.chips} role="radiogroup" aria-label="Quiet hours">
          {QUIET_OPTIONS.map((q) => (
            <Chip key={quietLabel(q)} active={sameQuiet(prefs.quiet, q)} onClick={() => setNotifPrefs({ quiet: q })}>
              {quietLabel(q)}
            </Chip>
          ))}
        </div>
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

/** A made-up day of phone use, played through the real rules, with every notification that would go out. */
function ExampleDay({ s, on }: { s: GoRealState; on: boolean }) {
  const [day] = useState(() => new Date());
  const { intervals, fired, total } = useMemo(() => {
    const base = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const list: UsageInterval[] = EXAMPLE_DAY.map(([h, m, len]) => {
      const start = base + (h * 60 + m) * 60_000;
      return { app: s.blockedApps[0] ?? "TikTok", start, end: start + len * 60_000 };
    });
    const sim = exampleState(s, day);
    return {
      intervals: list,
      fired: simulateDay(sim, list, day),
      total: EXAMPLE_DAY.reduce((sum, [, , len]) => sum + len, 0),
    };
  }, [s, day]);

  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const span = (CHART_TO - CHART_FROM) * 3_600_000;
  const pct = (ms: number) => Math.min(100, Math.max(0, ((ms - dayStart - CHART_FROM * 3_600_000) / span) * 100));
  const rows: number[] = [];
  const lastInRow: number[] = [];
  for (const n of fired) {
    const x = pct(n.at);
    let row = 0;
    while (lastInRow[row] !== undefined && x - lastInRow[row] < PIN_SPACING) row++;
    lastInRow[row] = x;
    rows.push(row);
  }
  const rowCount = Math.max(1, ...rows.map((r) => r + 1));
  const quiet = s.notif.prefs.quiet;
  const bands: [number, number][] =
    !quiet || quiet.start === quiet.end
      ? []
      : quiet.start > quiet.end
        ? [[CHART_FROM, Math.max(CHART_FROM, quiet.end)], [quiet.start, CHART_TO]]
        : [[quiet.start, quiet.end]];

  return (
    <section className={on ? undefined : styles.off}>
      <h2 className={shared.sectionTitle}>A day with Rilo</h2>
      <div className={shared.card}>
        <p className={styles.rowHint}>
          An example: {formatMinutes(total)} on your phone, a {EXAMPLE_STREAK}-day streak and no break yet. With your
          limit of {formatMinutes(s.phoneLimit)}, this is what Rilo would send.
        </p>

        <div className={styles.chart}>
          <div className={styles.pins} style={{ height: 26 + (rowCount - 1) * 24 }}>
            {fired.map((n, i) => (
              <motion.span
                key={n.id}
                className={styles.pinLabel}
                style={{ left: `${pct(n.at)}%`, bottom: 4 + rows[i] * 24 }}
                initial={{ scale: 0, y: 6 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.08 * i, type: "spring", stiffness: 500, damping: 24 }}
              >
                {i + 1}
              </motion.span>
            ))}
          </div>
          <div className={styles.track}>
            {bands.map(([a, b]) => (
              <span
                key={a}
                className={styles.band}
                style={{
                  left: `${((a - CHART_FROM) / (CHART_TO - CHART_FROM)) * 100}%`,
                  width: `${((b - a) / (CHART_TO - CHART_FROM)) * 100}%`,
                }}
              />
            ))}
            {intervals.map((i) => (
              <span
                key={i.start}
                className={styles.use}
                style={{ left: `${pct(i.start)}%`, width: `${pct(i.end) - pct(i.start)}%` }}
              />
            ))}
            {fired.map((n) => (
              <span key={n.id} className={styles.tick} style={{ left: `${pct(n.at)}%` }} />
            ))}
          </div>
          <div className={styles.axis} aria-hidden>
            {[6, 12, 18, 24].map((h) => (
              <span key={h}>{h}:00</span>
            ))}
          </div>
          <p className={styles.legend}>
            <span className={styles.swatchUse} /> Phone in use
            {quiet && (
              <>
                <span className={styles.swatch} /> Quiet hours
              </>
            )}
          </p>
        </div>

        {fired.length === 0 ? (
          <p className={styles.empty}>Rilo would stay quiet all day.</p>
        ) : (
          <ol className={styles.fired}>
            {fired.map((n, i) => (
              <li key={n.id}>
                <span className={styles.num}>{i + 1}</span>
                <div className={styles.firedCard}>
                  <NotificationCard kind={n.kind} title={n.title} body={n.body} time={formatClockTime(n.at)} />
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className={styles.rowHint}>
          At most {DAILY_CAP} nudges a day and at least {MIN_GAP_MINUTES} minutes apart, so a long evening is not a
          stream of pings.
        </p>
      </div>
    </section>
  );
}

/** Move the sliders and see what Rilo would say right now. */
function Simulator({ s, on }: { s: GoRealState; on: boolean }) {
  const limit = s.phoneLimit;
  const [used, setUsed] = useState(Math.round(limit * 0.5));
  const [session, setSession] = useState(20);
  const [evening, setEvening] = useState(false);

  const result = useMemo(() => {
    const d = new Date();
    const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), evening ? 21 : 15, 0);
    const sim = exampleState(s, at);
    const key = dayKey(at);
    sim.days[key] = { ...sim.days[key], phoneMinutes: used };
    sim.notif = { ...sim.notif, prefs: { ...sim.notif.prefs, quiet: null } };
    const usage = {
      todayMinutes: used,
      session: session > 0 ? { startedAt: at.getTime() - session * 60_000, minutes: session } : null,
      foregroundApp: null,
    };
    return usageTriggers(sim, usage, at)[0] ?? null;
  }, [s, used, session, evening]);

  const reasons: string[] = [];
  if (!result) {
    if (used < Math.ceil(limit * LIMIT_WARNING_SHARE)) reasons.push(`under ${Math.round(LIMIT_WARNING_SHARE * 100)}% of your limit`);
    if (session < s.notif.prefs.sessionMinutes) reasons.push(`a session shorter than ${s.notif.prefs.sessionMinutes} min`);
    if (!evening || session < RISK_SESSION_MINUTES) reasons.push(`not on your phone after ${RISK_FROM_HOUR}:00`);
  }

  return (
    <section className={on ? undefined : styles.off}>
      <h2 className={shared.sectionTitle}>Try it</h2>
      <div className={shared.card}>
        <Slider
          label="Phone time today"
          value={used}
          max={Math.round(limit * 1.5)}
          step={5}
          onChange={setUsed}
          text={`${formatMinutes(used)} of ${formatMinutes(limit)}`}
        />
        <Slider
          label="On your phone right now"
          value={session}
          max={120}
          step={5}
          onChange={setSession}
          text={session === 0 ? "Not using it" : `${formatMinutes(session)} without a pause`}
        />
        <div className={styles.simTime}>
          <span className={styles.rowTitle}>It is evening</span>
          <Switch label="It is evening" checked={evening} onChange={setEvening} />
        </div>
        <div className={styles.simOut}>
          {result ? (
            <NotificationCard kind={result.kind} title={result.title} body={result.body} time="now" />
          ) : (
            <p className={styles.empty}>Rilo stays quiet: {reasons.join(", ")}.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  max,
  step,
  onChange,
  text,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  text: string;
}) {
  return (
    <label className={styles.slider}>
      <span className={styles.sliderHead}>
        <span className={styles.rowTitle}>{label}</span>
        <span className={styles.sliderValue}>{text}</span>
      </span>
      <input type="range" min={0} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="radio" aria-checked={active} className={`${styles.chip} ${active ? styles.chipOn : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}
