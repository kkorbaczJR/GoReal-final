"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/Button";
import Mascot from "@/components/Mascot";
import { PixelIcon } from "@/components/PixelIcon";
import {
  clearRedirectError,
  continueWithGoogle,
  logInWithEmail,
  onGooglePopupLeft,
  preloadAccounts,
  sendPasswordReset,
  signUpWithEmail,
  useAccount,
} from "@/lib/account";
import { getState, useGoReal } from "@/lib/store";
import { MIN_PASSWORD } from "@/lib/sync-rules";
import styles from "./AuthScreen.module.css";

type Mode = "login" | "signup" | "reset";

const TITLE: Record<Mode, string> = {
  login: "Welcome back",
  signup: "Save your progress",
  reset: "Reset your password",
};

export default function AuthScreen({ mode: initialMode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const account = useAccount();
  const s = useGoReal();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => preloadAccounts(), []);

  useEffect(() => {
    if (busy !== "google") return;
    return onGooglePopupLeft(() => setBusy((b) => (b === "google" ? null : b)));
  }, [busy]);

  const enter = () => router.replace(getState().onboarded ? "/home" : "/onboarding");

  useEffect(() => {
    if (account.status === "signedIn" && !busy) enter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.status, busy]);

  const shownError = error ?? (account.status === "signedOut" ? (account.error ?? null) : null);

  const switchMode = (next: Mode) => {
    clearRedirectError();
    setMode(next);
    setError(null);
    setResetSent(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    clearRedirectError();
    setError(null);
    if (mode === "signup" && password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setBusy("email");
    const result =
      mode === "reset"
        ? await sendPasswordReset(email)
        : mode === "signup"
          ? await signUpWithEmail(email, password)
          : await logInWithEmail(email, password);
    setBusy(null);
    if (result !== null) return setError(result || null);
    if (mode === "reset") setResetSent(true);
    else enter();
  };

  const google = async () => {
    if (busy) return;
    clearRedirectError();
    setError(null);
    setBusy("google");
    const result = await continueWithGoogle();
    setBusy(null);
    if (result !== null) setError(result || null);
    else enter();
  };

  const back = () => (window.history.length > 1 ? router.back() : router.replace("/"));

  if (account.status === "off") {
    return (
      <main className={styles.page}>
        <Header onBack={back} />
        <div className={styles.center}>
          <Mascot mood="sleeping" size={110} />
          <h1 className={styles.title}>Accounts are coming soon</h1>
          <p className={styles.lede}>For now your progress is saved on this phone.</p>
        </div>
      </main>
    );
  }

  const hasProgress = s?.onboarded ?? false;
  const canSubmit = email.trim().length > 3 && (mode === "reset" || password.length > 0);

  return (
    <main className={styles.page}>
      <Header onBack={mode === "reset" ? () => switchMode("login") : back} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          className={styles.body}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.hero}>
            <Mascot mood={mode === "reset" ? "happy" : "wave"} size={96} />
          </div>
          <h1 className={styles.title}>{TITLE[mode]}</h1>
          <p className={styles.lede}>
            {mode === "signup"
              ? "Your streak, coins and everything Rilo owns stay safe, even on a new phone."
              : mode === "login"
                ? hasProgress
                  ? "Log in to get your progress back. Your account's progress replaces what's on this phone."
                  : "Log in to get your progress back."
                : "Type the email you signed up with and we'll send you a link to pick a new password."}
          </p>

          {mode !== "reset" && (
            <>
              <GoogleButton onClick={google} busy={busy === "google"} disabled={busy !== null} />
              <div className={styles.or}>
                <span>or with email</span>
              </div>
            </>
          )}

          {resetSent ? (
            <div className={styles.sent} role="status">
              <PixelIcon name="check" size={20} />
              <span>
                If there&apos;s an account for <b>{email.trim()}</b>, a reset link is on its way. Check your spam folder
                too.
              </span>
            </div>
          ) : (
            <form className={styles.form} onSubmit={submit} noValidate>
              <input
                className={styles.input}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email"
              />
              {mode !== "reset" && (
                <div className={styles.passwordRow}>
                  <input
                    className={styles.input}
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder={mode === "signup" ? `Password (${MIN_PASSWORD}+ characters)` : "Password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    className={styles.show}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              )}

              <AnimatePresence>
                {shownError && (
                  <motion.p
                    className={styles.error}
                    role="alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {shownError}
                  </motion.p>
                )}
              </AnimatePresence>

              <Button full type="submit" disabled={!canSubmit || busy !== null}>
                {busy === "email"
                  ? mode === "reset"
                    ? "Sending..."
                    : mode === "signup"
                      ? "Creating your account..."
                      : "Logging in..."
                  : mode === "reset"
                    ? "Send reset link"
                    : mode === "signup"
                      ? "Create account"
                      : "Log in"}
              </Button>
            </form>
          )}

          <div className={styles.links}>
            {mode === "login" && (
              <>
                <button type="button" className={styles.link} onClick={() => switchMode("reset")}>
                  Forgot password?
                </button>
                <span className={styles.switch}>
                  New here?{" "}
                  <button type="button" className={styles.linkStrong} onClick={() => switchMode("signup")}>
                    Create an account
                  </button>
                </span>
              </>
            )}
            {mode === "signup" && (
              <span className={styles.switch}>
                Already have an account?{" "}
                <button type="button" className={styles.linkStrong} onClick={() => switchMode("login")}>
                  Log in
                </button>
              </span>
            )}
            {mode === "reset" && resetSent && (
              <Button full variant="secondary" onClick={() => switchMode("login")}>
                Back to log in
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className={styles.header}>
      <button className={styles.back} onClick={onBack} aria-label="Back">
        <PixelIcon name="chevronLeft" size={18} />
        <span>Back</span>
      </button>
    </header>
  );
}

export function GoogleButton({ onClick, busy, disabled }: { onClick: () => void; busy: boolean; disabled: boolean }) {
  return (
    <button type="button" className={styles.google} onClick={onClick} disabled={disabled}>
      <GoogleMark />
      <span>{busy ? "Opening Google..." : "Continue with Google"}</span>
    </button>
  );
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
