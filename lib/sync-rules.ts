/**
 * How progress moves between this phone and the account. The whole saved state is one document per account;
 * whichever side changed last wins. Pure, so it can be tested without Firebase.
 */

/** What this phone remembers about the account it is signed in to. */
export type SyncMeta = {
  uid: string;
  /** `rev` of the cloud copy this phone last wrote or read. */
  syncedRev: number | null;
  /** When this phone changed something not yet saved to the account, or null when everything is saved. */
  changedAt: number | null;
};

/** The cloud copy, as far as deciding goes. */
export type CloudInfo = { rev: number } | null;

export type SyncStep = "push" | "pull" | "none";

/**
 * What to do after reading the cloud copy.
 * - First time this account is used on this phone: the account wins. With no cloud copy yet (a new account),
 *   this phone's progress becomes the account's.
 * - Cloud unchanged since we last saw it: push if we have unsaved changes.
 * - Cloud changed on another device: take it, unless this phone also changed later.
 */
/**
 * `onboarded`: this phone and the account. A phone that has not finished onboarding must never overwrite
 * an account that already has progress (Start over, or logging in from the first onboarding step).
 */
export function syncStep(
  meta: SyncMeta | null,
  uid: string,
  cloud: CloudInfo,
  onboarded?: { local: boolean; cloud: boolean },
): SyncStep {
  const known = meta !== null && meta.uid === uid;
  if (!cloud) return "push";
  if (onboarded && !onboarded.local && onboarded.cloud) return "pull";
  if (!known) return "pull";
  if (cloud.rev === meta.syncedRev) return meta.changedAt === null ? "none" : "push";
  if (meta.changedAt !== null && meta.changedAt > cloud.rev) return "push";
  return "pull";
}

/** Fields that belong to this phone, not the account: a break running right now, a one-off message, and
 * whether the Android app measures phone time. They are never uploaded and a download keeps this phone's. */
export const DEVICE_FIELDS = ["activeBreak", "notice", "phoneTracking"] as const;

type DeviceField = (typeof DEVICE_FIELDS)[number];

export function forCloud<T extends Record<DeviceField, unknown>>(s: T): Omit<T, DeviceField> {
  const copy: Record<string, unknown> = { ...s };
  for (const f of DEVICE_FIELDS) delete copy[f];
  return copy as Omit<T, DeviceField>;
}

export function fromCloud<T extends Record<DeviceField, unknown>>(cloud: Record<string, unknown>, local: T) {
  const copy: Record<string, unknown> = { ...cloud };
  for (const f of DEVICE_FIELDS) copy[f] = local[f];
  return copy;
}

export const MIN_PASSWORD = 8;

/** Friendly text for a Firebase Auth error code. Empty when there is nothing to say (the user closed the popup). */
export function authErrorText(code: string): string {
  switch (code) {
    case "auth/invalid-email":
    case "auth/missing-email":
      return "That email doesn't look right.";
    case "auth/missing-password":
    case "auth/weak-password":
      return `Use at least ${MIN_PASSWORD} characters for your password.`;
    case "auth/email-already-in-use":
      return "There's already an account with this email. Log in instead.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/user-disabled":
      return "This account is turned off.";
    case "auth/too-many-requests":
      return "Too many tries. Wait a minute and try again.";
    case "auth/network-request-failed":
      return "No internet connection. Try again when you're online.";
    case "auth/account-exists-with-different-credential":
      return "This email already has an account with a password. Log in with email and password.";
    case "auth/requires-recent-login":
      return "For safety, log out, log in again, then delete your account.";
    case "auth/unauthorized-domain":
      return "Google sign-in isn't set up for this website yet.";
    case "auth/operation-not-allowed":
      return "This way of signing in isn't turned on yet.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "";
    default:
      return "Something went wrong. Try again.";
  }
}
