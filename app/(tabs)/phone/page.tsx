"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Mascot from "@/components/Mascot";
import { refreshPhone } from "@/components/PhoneTracker";
import { PixelIcon } from "@/components/PixelIcon";
import { addDays, dayKey, formatMinutes } from "@/lib/date";
import { canMeasure, installedApps, openUsageSettings, usePhone } from "@/lib/phone";
import { goalsFor } from "@/lib/rules";
import { useGoReal } from "@/lib/store";
import { minutesByApp } from "@/lib/usage";
import shared from "../tabs.module.css";
import styles from "./phone.module.css";

function listApps(apps: string[]) {
  if (apps.length <= 1) return apps.join("");
  return `${apps.slice(0, -1).join(", ")} and ${apps[apps.length - 1]}`;
}

function clock(ms: number) {
  return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function PhoneTime() {
  const s = useGoReal()!;
  const router = useRouter();
  const { access, reading } = usePhone();
  const [android] = useState(canMeasure);
  const [installed, setInstalled] = useState<Set<string> | null>(null);
  const apps = s.blockedApps.join(",");

  useEffect(() => {
    void refreshPhone();
  }, []);

  useEffect(() => {
    if (android) void installedApps(apps.split(",")).then(setInstalled);
  }, [android, apps]);

  const measuring = android && s.phoneTracking && access !== "off";

  return (
    <main className={shared.page}>
      <div className={shared.top}>
        <button className={styles.back} onClick={() => router.back()} aria-label="Back">
          <PixelIcon name="chevronLeft" size={18} />
          <span>Back</span>
        </button>
      </div>

      {!android && (
        <div>
          <h1 className={shared.heading}>Phone time</h1>
          <p className={shared.lede}>
            A browser cannot see other apps, so on the website you log your phone time yourself on Today. The
            Android app measures it for you.
          </p>
        </div>
      )}

      {android && !measuring && <Setup apps={s.blockedApps} />}

      {measuring && (
        <Measured
          s={s}
          session={reading?.snapshot.session ?? null}
          byApp={reading ? minutesByApp(reading.intervals, startOfToday(), reading.at) : null}
          updated={reading?.at ?? null}
          installed={installed}
        />
      )}
    </main>
  );
}

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function Setup({ apps }: { apps: string[] }) {
  return (
    <>
      <div className={styles.hero}>
        <Mascot mood="wave" size={104} />
        <h1 className={shared.heading}>Let GoReal measure your phone time</h1>
        <p className={shared.lede}>
          Then you never type it in, and Rilo can tell you when a scroll gets long or you get close to your limit.
        </p>
      </div>

      <ul className={styles.facts}>
        <li>
          <PixelIcon name="check" size={18} />
          <span>
            It counts only the apps you picked: <b>{listApps(apps)}</b>.
          </span>
        </li>
        <li>
          <PixelIcon name="check" size={18} />
          <span>It sees when they were open and for how long. Never what is inside them: no messages, videos or posts.</span>
        </li>
        <li>
          <PixelIcon name="check" size={18} />
          <span>Everything stays on this phone.</span>
        </li>
        <li>
          <PixelIcon name="check" size={18} />
          <span>You can turn it off again in the same place, any time.</span>
        </li>
      </ul>

      <section className={shared.card}>
        <h2 className={shared.sectionTitle}>How to turn it on</h2>
        <ol className={styles.steps}>
          <li>Tap Open settings below.</li>
          <li>Find GoReal in the list.</li>
          <li>Turn on &quot;Permit usage access&quot; (some phones call it &quot;Allow usage access&quot;).</li>
          <li>Come back to GoReal. It notices on its own.</li>
        </ol>
      </section>

      <Button full variant="accent" onClick={openUsageSettings}>
        Open settings
      </Button>
      <p className={styles.note}>Not now? You can keep logging your phone time yourself on Today.</p>
    </>
  );
}

function Measured({
  s,
  session,
  byApp,
  updated,
  installed,
}: {
  s: NonNullable<ReturnType<typeof useGoReal>>;
  session: { startedAt: number; minutes: number } | null;
  byApp: { app: string; minutes: number }[] | null;
  updated: number | null;
  installed: Set<string> | null;
}) {
  const todayKey = dayKey();
  const today = s.days[todayKey];
  const used = today?.phoneMinutes ?? 0;
  const limit = goalsFor(today, s).phoneLimit;
  const over = used > limit;
  const minutesFor = (app: string) => byApp?.find((a) => a.app === app)?.minutes ?? 0;

  const past = [1, 2].map((back) => {
    const date = addDays(new Date(), -back);
    const day = s.days[dayKey(date)];
    return {
      label: back === 1 ? "Yesterday" : date.toLocaleDateString("en-GB", { weekday: "long" }),
      minutes: day?.phoneMinutes,
      limit: goalsFor(day, s).phoneLimit,
    };
  });

  return (
    <>
      <div>
        <h1 className={shared.heading}>Phone time</h1>
        <p className={shared.lede}>Measured on this phone, in the apps you picked.</p>
      </div>

      <section className={shared.card}>
        <div className={styles.big}>
          <span className={styles.bigNum}>{formatMinutes(used)}</span>
          <span className={styles.bigOf}>of {formatMinutes(limit)} today</span>
        </div>
        <div className={styles.bar}>
          <motion.div
            className={`${styles.barFill} ${over ? styles.barOver : ""}`}
            initial={false}
            animate={{ width: `${Math.min(1, used / limit) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <p className={styles.status}>
          {over
            ? `Over your limit by ${formatMinutes(used - limit)}. A break can still make today count.`
            : `${formatMinutes(limit - used)} left. Stay under until midnight and today counts.`}
        </p>
      </section>

      <div className={shared.group}>
        <div className={shared.groupRow}>
          <span className={styles.rowLabel}>Current session</span>
          <span className={styles.rowValue}>
            {session && session.minutes > 0 ? `${formatMinutes(session.minutes)} without a pause` : "None right now"}
          </span>
        </div>
        {s.blockedApps.map((app) => {
          const missing = installed !== null && !installed.has(app);
          return (
            <div key={app} className={shared.groupRow}>
              <span className={styles.rowLabel}>{app}</span>
              <span className={styles.rowValue}>{missing ? "Not on this phone" : formatMinutes(minutesFor(app))}</span>
            </div>
          );
        })}
      </div>

      <section>
        <h2 className={shared.sectionTitle}>Last days</h2>
        <div className={shared.group}>
          {past.map((p) => (
            <div key={p.label} className={shared.groupRow}>
              <span className={styles.rowLabel}>{p.label}</span>
              <span className={styles.rowValue}>
                {p.minutes === undefined
                  ? "Not measured"
                  : `${formatMinutes(p.minutes)}, ${p.minutes <= p.limit ? "under" : "over"} ${formatMinutes(p.limit)}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className={styles.note}>
        {updated !== null && <>Updated at {clock(updated)}. </>}
        GoReal only counts {listApps(s.blockedApps)}, and never sees what is inside them. To stop, turn off usage
        access for GoReal.
      </p>
      <Button full variant="secondary" onClick={openUsageSettings}>
        Usage access settings
      </Button>
    </>
  );
}
