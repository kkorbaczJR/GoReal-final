/** The public site. Absolute, so a shared card never points at localhost or a relative Pages path. */
export const APP_URL = "https://kkorbaczjr.github.io/GoReal-final/";

/** Short enough to sit on the card. */
export const APP_URL_LABEL = "kkorbaczjr.github.io/GoReal-final";

/**
 * Captions on the card. None of them name the person: the app is used by minors.
 * Picked at random once per preview, then kept while the format toggle redraws.
 */
export const SHARE_LINES = [
  "I took real breaks from my phone with Rilo",
  "Rilo napped. I stayed off my phone.",
  "One more day away from the scroll.",
  "Real breaks. A real streak.",
  "Phone down. Rilo approves.",
] as const;

export function pickShareLine(random: () => number = Math.random): string {
  const index = Math.min(SHARE_LINES.length - 1, Math.floor(random() * SHARE_LINES.length));
  return SHARE_LINES[index] ?? SHARE_LINES[0];
}

/** "12-day streak", including a streak of 0. The card draws the number big and this line under it. */
export function streakLabel(count: number): string {
  const days = Math.max(0, Math.floor(count));
  return days === 1 ? "1-day streak" : `${days}-day streak`;
}
