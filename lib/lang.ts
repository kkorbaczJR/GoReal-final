/** The two languages GoReal speaks. English is the default. */
export type Lang = "en" | "pl";

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "pl";
}

/** Polish has three plural forms. English uses "one" and "many" only. */
export function pluralForm(lang: Lang, n: number): "one" | "few" | "many" {
  const abs = Math.abs(Math.trunc(n));
  if (lang === "en") return abs === 1 ? "one" : "many";
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return "one";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "few";
  return "many";
}

/** "1 day" / "1 dzień", "3 days" / "3 dni", "5 days" / "5 dni". The number is included. */
export function count(lang: Lang, n: number, enOne: string, enMany: string, plOne: string, plFew: string, plMany: string): string {
  const word =
    lang === "pl"
      ? pluralForm("pl", n) === "one"
        ? plOne
        : pluralForm("pl", n) === "few"
          ? plFew
          : plMany
      : n === 1
        ? enOne
        : enMany;
  return `${n} ${word}`;
}

export function days(lang: Lang, n: number): string {
  return count(lang, n, "day", "days", "dzień", "dni", "dni");
}

export function minutesWord(lang: Lang, n: number): string {
  return count(lang, n, "minute", "minutes", "minuta", "minuty", "minut");
}

/** How a break notification says the time remaining. Never a clock time. */
export function minutesLeft(lang: Lang, n: number): string {
  const m = Math.max(0, Math.trunc(n));
  if (lang !== "pl") return m === 1 ? "1 minute left" : `${m} minutes left`;
  const form = pluralForm("pl", m);
  if (form === "one") return `została ${m} minuta`;
  if (form === "few") return `zostały ${m} minuty`;
  return `zostało ${m} minut`;
}

export function coinsWord(lang: Lang, n: number): string {
  return count(lang, n, "coin", "coins", "moneta", "monety", "monet");
}

/** "a day" / "3 days" for the freeze notification, already a phrase. */
export function missedDays(lang: Lang, n: number): string {
  if (lang === "pl") {
    if (n === 1) return "jeden dzień";
    return days("pl", n);
  }
  return n === 1 ? "a day" : `${n} days`;
}

/** What is left in the freeze stock, as a full sentence. */
export function freezesLeft(lang: Lang, n: number): string {
  if (n <= 0) return lang === "pl" ? "To było ostatnie." : "That was your last one.";
  if (lang === "pl") {
    const form = pluralForm("pl", n);
    const verb = form === "few" ? "Zostały" : "Zostało";
    return `${verb} jeszcze ${n}.`;
  }
  return `You have ${n} left.`;
}
