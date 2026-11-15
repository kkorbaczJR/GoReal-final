"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Mascot from "@/components/Mascot";
import { refreshPhone } from "@/components/PhoneTracker";
import { PixelIcon } from "@/components/PixelIcon";
import { addDays, dayKey, formatMinutes } from "@/lib/date";
import { useCopy } from "@/lib/i18n";
import { canMeasure, installedApps, openUsageSettings, usePhone } from "@/lib/phone";
import { goalsFor } from "@/lib/rules";
import { useGoReal } from "@/lib/store";
import { minutesByApp } from "@/lib/usage";
import shared from "../tabs.module.css";
import styles from "./phone.module.css";

function listApps(apps: string[], and: string) {
  if (apps.length <= 1) return apps.join("");
  return `${apps.slice(0, -1).join(", ")} ${and} ${apps[apps.length - 1]}`;
}

function clock(ms: number, locale: string) {
  return new Date(ms).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export default function PhoneTime() {
  const s = useGoReal()!;
  const { c } = useCopy();
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
        <button className={styles.back} onClick={() => router.back()} aria-label={c.back}>
          <PixelIcon name="chevronLeft" size={18} />
          <span>{c.back}</span>
        </button>
      </div>

      {!android && (
        <div>
          <h1 className={shared.heading}>{c.phoneTime}</h1>
          <p className={shared.lede}>{c.phoneWeb}</p>
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
  const { c } = useCopy();
  return (
    <>
      <div className={styles.hero}>
        <Mascot mood="wave" size={104} />
        <h1 className={shared.heading}>{c.measureTitle}</h1>
        <p className={shared.lede}>{c.measureLede}</p>
      </div>

      <ul className={styles.facts}>
        <li>
          <PixelIcon name="check" size={18} />
          <span>{c.measurePicked(listApps(apps, c.and))}</span>
        </li>
        <li>
          <PixelIcon name="check" size={18} />
          <span>{c.measureInside}</span>
        </li>
        <li>
          <PixelIcon name="check" size={18} />
          <span>{c.measureStays}</span>
        </li>
        <li>
          <PixelIcon name="check" size={18} />
          <span>{c.measureOff}</span>
        </li>
      </ul>

      <section className={shared.card}>
        <h2 className={shared.sectionTitle}>{c.howOn}</h2>
        <ol className={styles.steps}>
          {c.howSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <Button full variant="accent" onClick={openUsageSettings}>
        {c.openSettings}
      </Button>
      <p className={styles.note}>{c.notNowLog}</p>
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
  const { lang, c } = useCopy();
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
      label: back === 1 ? c.yesterday : date.toLocaleDateString(c.dateLocale, { weekday: "long" }),
      minutes: day?.phoneMinutes,
      limit: goalsFor(day, s).phoneLimit,
    };
  });

  return (
    <>
      <div>
        <h1 className={shared.heading}>{c.phoneTime}</h1>
        <p className={shared.lede}>{c.measuredLede}</p>
      </div>

      <section className={shared.card}>
        <div className={styles.big}>
          <span className={styles.bigNum}>{formatMinutes(used, lang)}</span>
          <span className={styles.bigOf}>{c.ofToday(formatMinutes(limit, lang))}</span>
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
            ? c.overBy(formatMinutes(used - limit, lang))
            : c.leftUntil(formatMinutes(limit - used, lang))}
        </p>
      </section>

      <div className={shared.group}>
        <div className={shared.groupRow}>
          <span className={styles.rowLabel}>{c.currentSession}</span>
          <span className={styles.rowValue}>
            {session && session.minutes > 0 ? c.noPause(formatMinutes(session.minutes, lang)) : c.noneNow}
          </span>
        </div>
        {s.blockedApps.map((app) => {
          const missing = installed !== null && !installed.has(app);
          return (
            <div key={app} className={shared.groupRow}>
              <span className={styles.rowLabel}>{app}</span>
              <span className={styles.rowValue}>{missing ? c.notOnPhone : formatMinutes(minutesFor(app), lang)}</span>
            </div>
          );
        })}
      </div>

      <section>
        <h2 className={shared.sectionTitle}>{c.lastDays}</h2>
        <div className={shared.group}>
          {past.map((p) => (
            <div key={p.label} className={shared.groupRow}>
              <span className={styles.rowLabel}>{p.label}</span>
              <span className={styles.rowValue}>
                {p.minutes === undefined
                  ? c.notMeasured
                  : `${formatMinutes(p.minutes, lang)}, ${p.minutes <= p.limit ? c.under : c.over} ${formatMinutes(p.limit, lang)}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className={styles.note}>
        {updated !== null && <>{c.updatedAt(clock(updated, c.timeLocale))} </>}
        {c.onlyCounts(listApps(s.blockedApps, c.and))}
      </p>
      <Button full variant="secondary" onClick={openUsageSettings}>
        {c.usageSettings}
      </Button>
    </>
  );
}
