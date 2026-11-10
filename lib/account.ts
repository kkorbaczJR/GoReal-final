"use client";

import type { FirebaseApp } from "firebase/app";
import type { Auth, User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { EMULATOR_HOST, FIREBASE_CONFIG, accountsEnabled } from "./firebase-config";
import { getState, replaceState, resetEverything, setLocalChangeHook } from "./store";
import { authErrorText, forCloud, fromCloud, syncStep, type SyncMeta } from "./sync-rules";

/**
 * Accounts: sign up with any email (or Google), log in on another phone and get the same progress back.
 * Firebase Auth holds the login, one Firestore document per account (`users/<uid>`) holds the saved state.
 * Firebase is only downloaded once someone has signed in on this phone or opens a sign-in screen.
 */

export type Account =
  | { status: "off" }
  | { status: "loading" }
  /** `error`: a Google sign-in that went through a full-page redirect failed. */
  | { status: "signedOut"; error?: string }
  | { status: "signedIn"; email: string; verified: boolean; google: boolean; saving: "saved" | "saving" | "offline" };

type Firebase = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  a: typeof import("firebase/auth");
  f: typeof import("firebase/firestore");
};

const META_KEY = "goreal:account";
const REDIRECT_KEY = "goreal:google-redirect";
const PUSH_DELAY_MS = 1500;
const LOGOUT_FLUSH_MS = 5000;

let fb: Firebase | null = null;
let loading: Promise<Firebase> | null = null;
let account: Account = { status: "off" };
let started = false;
const listeners = new Set<() => void>();

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let syncing: Promise<void> | null = null;
let pushing: Promise<void> | null = null;
let offline = false;
let redirectError: string | null = null;

/* ---------- account state for React ---------- */

function setAccount(next: Account) {
  account = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const OFF: Account = { status: "off" };

export function useAccount(): Account {
  return useSyncExternalStore(
    subscribe,
    () => account,
    () => OFF,
  );
}

/**
 * Calls `onCancel` when the user comes back to the page from the Google popup without signing in. Firebase
 * itself takes about ten seconds to notice a closed popup. Returns a function that stops listening.
 */
export function onGooglePopupLeft(onCancel: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const onFocus = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (account.status !== "signedIn") onCancel();
    }, 800);
  };
  window.addEventListener("focus", onFocus);
  return () => {
    window.removeEventListener("focus", onFocus);
    if (timer) clearTimeout(timer);
  };
}

export function clearRedirectError() {
  redirectError = null;
  if (account.status === "signedOut" && account.error) setAccount({ status: "signedOut" });
}

/* ---------- this phone's sync bookkeeping ---------- */

function readMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as SyncMeta) : null;
  } catch {
    return null;
  }
}

function writeMeta(meta: SyncMeta | null) {
  try {
    if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(META_KEY);
  } catch {
    // Storage blocked: the account still works, it just syncs from scratch next time.
  }
}

/* ---------- loading Firebase ---------- */

/** Runs once when the app opens. Firebase is only loaded if this phone is signed in. */
export function startAccounts() {
  if (started) return;
  started = true;
  if (!accountsEnabled) return;
  let redirecting = false;
  try {
    redirecting = sessionStorage.getItem(REDIRECT_KEY) === "1";
  } catch {}
  if (readMeta() || redirecting) {
    setAccount({ status: "loading" });
    void load();
  } else {
    setAccount({ status: "signedOut" });
  }
  window.addEventListener("online", () => {
    if (account.status === "signedIn") void syncNow();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && account.status === "signedIn") void syncNow();
  });
}

/** Sign-in screens call this on open so the Google popup can open right away when tapped. */
export function preloadAccounts() {
  if (accountsEnabled) void load().catch(() => {});
}

function load(): Promise<Firebase> {
  loading ??= (async () => {
    const [appMod, a, f] = await Promise.all([import("firebase/app"), import("firebase/auth"), import("firebase/firestore")]);
    const app = appMod.getApps()[0] ?? appMod.initializeApp(FIREBASE_CONFIG);
    const auth = a.getAuth(app);
    const db = f.getFirestore(app);
    if (EMULATOR_HOST) {
      a.connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
      f.connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
    }
    fb = { app, auth, db, a, f };

    let redirecting = false;
    try {
      redirecting = sessionStorage.getItem(REDIRECT_KEY) === "1";
      sessionStorage.removeItem(REDIRECT_KEY);
    } catch {}
    if (redirecting) {
      await a.getRedirectResult(auth).catch((e: { code?: string }) => {
        redirectError = authErrorText(e.code ?? "") || null;
      });
    }
    a.onAuthStateChanged(auth, (user) => void onUser(user));
    return fb;
  })();
  loading.catch(() => {
    loading = null;
    if (account.status === "loading") setAccount({ status: "signedOut" });
  });
  return loading;
}

function signedIn(user: User, saving: "saved" | "saving" | "offline"): Account {
  return {
    status: "signedIn",
    email: user.email ?? "",
    verified: user.emailVerified,
    google: user.providerData.some((p) => p.providerId === "google.com"),
    saving,
  };
}

function refreshSaving() {
  const user = fb?.auth.currentUser;
  if (!user || account.status !== "signedIn") return;
  const meta = readMeta();
  const saving = offline ? "offline" : meta?.changedAt != null || pushing ? "saving" : "saved";
  if (saving !== account.saving || user.emailVerified !== account.verified) setAccount(signedIn(user, saving));
}

async function onUser(user: User | null) {
  if (!user) {
    setLocalChangeHook(null);
    writeMeta(null);
    setAccount(redirectError ? { status: "signedOut", error: redirectError } : { status: "signedOut" });
    return;
  }
  setAccount(signedIn(user, "saving"));
  setLocalChangeHook(markChanged);
  await syncNow();
}

/* ---------- syncing ---------- */

function userDoc(uid: string) {
  const { f, db } = fb!;
  return f.doc(db, "users", uid);
}

function markChanged() {
  const user = fb?.auth.currentUser;
  const meta = readMeta();
  if (!user || !meta || meta.uid !== user.uid) return;
  writeMeta({ ...meta, changedAt: Date.now() });
  refreshSaving();
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void push(), PUSH_DELAY_MS);
}

/** Reads the account's copy and either downloads it or uploads this phone's, whichever is newer. */
export function syncNow(): Promise<void> {
  syncing ??= runSync().finally(() => {
    syncing = null;
    refreshSaving();
  });
  return syncing;
}

async function runSync() {
  const user = fb?.auth.currentUser;
  if (!fb || !user) return;
  try {
    const snap = await fb.f.getDoc(userDoc(user.uid));
    offline = false;
    const data = snap.exists() ? snap.data() : null;
    const cloud = data && typeof data.rev === "number" && typeof data.data === "string" ? { rev: data.rev, data: data.data } : null;
    const meta = readMeta();
    const step = syncStep(meta, user.uid, cloud);
    if (step === "pull" && cloud) {
      replaceState(fromCloud(JSON.parse(cloud.data) as Record<string, unknown>, getState()));
      writeMeta({ uid: user.uid, syncedRev: cloud.rev, changedAt: null });
    } else if (step === "push") {
      if (!meta || meta.uid !== user.uid) writeMeta({ uid: user.uid, syncedRev: null, changedAt: Date.now() });
      await push();
    }
  } catch {
    offline = true;
  }
}

function push(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  pushing ??= runPush().finally(() => {
    pushing = null;
    refreshSaving();
  });
  return pushing;
}

async function runPush() {
  const user = fb?.auth.currentUser;
  const meta = readMeta();
  if (!fb || !user || !meta || meta.uid !== user.uid) return;
  const rev = Math.max(Date.now(), (meta.syncedRev ?? 0) + 1);
  const changedAt = meta.changedAt;
  try {
    await fb.f.setDoc(userDoc(user.uid), {
      data: JSON.stringify(forCloud(getState())),
      rev,
      updatedAt: fb.f.serverTimestamp(),
    });
    offline = false;
    const now = readMeta();
    if (now && now.uid === user.uid) {
      const changedSince = now.changedAt !== changedAt;
      writeMeta({ ...now, syncedRev: rev, changedAt: changedSince ? now.changedAt : null });
      if (changedSince) pushTimer = setTimeout(() => void push(), PUSH_DELAY_MS);
    }
  } catch {
    offline = true;
  }
}

/*
 * ---------- actions for the screens ----------
 * Each returns null when it worked, otherwise the error to show (empty when there is nothing to show, like a
 * closed Google popup).
 */

function failure(e: unknown): string {
  return authErrorText((e as { code?: string })?.code ?? "");
}

async function afterSignIn() {
  await syncNow();
}

export async function signUpWithEmail(email: string, password: string): Promise<string | null> {
  try {
    const { a, auth } = fb ?? (await load());
    const cred = await a.createUserWithEmailAndPassword(auth, email.trim(), password);
    void a.sendEmailVerification(cred.user).catch(() => {});
    await afterSignIn();
    return null;
  } catch (e) {
    return failure(e);
  }
}

export async function logInWithEmail(email: string, password: string): Promise<string | null> {
  try {
    const { a, auth } = fb ?? (await load());
    await a.signInWithEmailAndPassword(auth, email.trim(), password);
    await afterSignIn();
    return null;
  } catch (e) {
    return failure(e);
  }
}

/**
 * Google sign-in in a popup. Where popups can't open (some in-app browsers), the whole page goes to Google
 * and comes back; the result is picked up when the app loads again.
 */
export async function continueWithGoogle(): Promise<string | null> {
  try {
    const { a, auth } = fb ?? (await load());
    const provider = new a.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await a.signInWithPopup(auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "auth/popup-blocked" && code !== "auth/operation-not-supported-in-this-environment") throw e;
      try {
        sessionStorage.setItem(REDIRECT_KEY, "1");
      } catch {}
      await a.signInWithRedirect(auth, provider);
      return null;
    }
    await afterSignIn();
    return null;
  } catch (e) {
    return failure(e);
  }
}

/** Always says it worked when the email is valid, so nobody can find out which emails have an account. */
export async function sendPasswordReset(email: string): Promise<string | null> {
  try {
    const { a, auth } = fb ?? (await load());
    await a.sendPasswordResetEmail(auth, email.trim());
    return null;
  } catch (e) {
    const code = (e as { code?: string }).code;
    return code === "auth/user-not-found" ? null : failure(e);
  }
}

export async function resendVerification(): Promise<string | null> {
  const user = fb?.auth.currentUser;
  if (!fb || !user) return null;
  try {
    await fb.a.sendEmailVerification(user);
    return null;
  } catch (e) {
    return failure(e);
  }
}

/** Checks again whether the email was verified (after tapping the link in the email). */
export async function reloadUser() {
  const user = fb?.auth.currentUser;
  if (!user) return;
  await user.reload().catch(() => {});
  if (account.status === "signedIn") setAccount(signedIn(user, account.saving));
}

/** True while this phone has changes the account doesn't have yet. */
export function hasUnsavedChanges(): boolean {
  return readMeta()?.changedAt != null;
}

/** Saves what's left, signs out and starts this phone fresh. The progress stays in the account. */
export async function logOut(): Promise<string | null> {
  if (!fb) return null;
  if (hasUnsavedChanges()) {
    await Promise.race([push(), new Promise((r) => setTimeout(r, LOGOUT_FLUSH_MS))]);
  }
  try {
    setLocalChangeHook(null);
    if (pushTimer) clearTimeout(pushTimer);
    await fb.a.signOut(fb.auth);
    writeMeta(null);
    resetEverything();
    return null;
  } catch (e) {
    setLocalChangeHook(markChanged);
    return failure(e);
  }
}

/** Deletes the saved progress and the login for good, then starts this phone fresh. */
export async function deleteAccount(): Promise<string | null> {
  const user = fb?.auth.currentUser;
  if (!fb || !user) return null;
  setLocalChangeHook(null);
  if (pushTimer) clearTimeout(pushTimer);
  try {
    await fb.f.deleteDoc(userDoc(user.uid));
    try {
      await fb.a.deleteUser(user);
    } catch (e) {
      writeMeta({ uid: user.uid, syncedRev: null, changedAt: Date.now() });
      setLocalChangeHook(markChanged);
      await push();
      throw e;
    }
    writeMeta(null);
    resetEverything();
    return null;
  } catch (e) {
    setLocalChangeHook(markChanged);
    return failure(e);
  }
}
