
function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local calendar day as "YYYY-MM-DD". */
export function dayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Monday 00:00 (local time) of the week that contains `date`. */
export function weekStart(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - weekday);
  return d;
}

export function formatMinutes(minutes: number, lang: "en" | "pl" = "en"): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hour = lang === "pl" ? "godz." : "h";
  return m === 0 ? `${h} ${hour}` : `${h} ${hour} ${m} min`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  return `${pad(m)}:${pad(s % 60)}`;
}
