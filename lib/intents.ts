/** One-shot requests between screens, e.g. a notification asking Today to open the streak screen. */
const EVENT = "goreal:open-streak";
let pendingStreak = false;

export function requestOpenStreak() {
  pendingStreak = true;
  window.dispatchEvent(new Event(EVENT));
}

/** True once if the streak screen was requested since the last call. */
export function consumeOpenStreak(): boolean {
  const was = pendingStreak;
  pendingStreak = false;
  return was;
}

export function onOpenStreak(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
