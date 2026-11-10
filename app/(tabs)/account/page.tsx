"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Mascot from "@/components/Mascot";
import { PixelIcon } from "@/components/PixelIcon";
import Sheet from "@/components/Sheet";
import { deleteAccount, logOut, reloadUser, resendVerification, useAccount } from "@/lib/account";
import shared from "../tabs.module.css";
import styles from "./account.module.css";

const SAVING_TEXT = {
  saved: "Saved to your account",
  saving: "Saving...",
  offline: "Offline. It saves when you're back online.",
};

export default function AccountPage() {
  const router = useRouter();
  const account = useAccount();
  const [sheet, setSheet] = useState<"logout" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (account.status === "off") router.replace("/profile");
  }, [account.status, router]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void reloadUser();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const close = () => {
    if (busy) return;
    setSheet(null);
    setError(null);
  };

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result !== null) return setError(result || "Something went wrong. Try again.");
    setSheet(null);
    router.replace("/onboarding");
  };

  const resend = async () => {
    const result = await resendVerification();
    if (result === null) setResent(true);
    else setError(result || null);
  };

  return (
    <main className={shared.page}>
      <div className={shared.top}>
        <button className={styles.back} onClick={() => router.back()} aria-label="Back">
          <PixelIcon name="chevronLeft" size={18} />
          <span>Back</span>
        </button>
      </div>

      <h1 className={shared.heading}>Account</h1>

      {account.status === "loading" && <p className={shared.muted}>Checking your account...</p>}

      {account.status === "signedOut" && (
        <section className={`${shared.card} ${styles.invite}`}>
          <Mascot mood="happy" size={96} />
          <h2 className={styles.inviteTitle}>Save your progress</h2>
          <p className={styles.inviteText}>
            With an account your streak, coins and everything Rilo owns come back on any phone or computer.
          </p>
          <Button full onClick={() => router.push("/signup")}>
            Create account
          </Button>
          <Button full variant="secondary" onClick={() => router.push("/login")}>
            Log in
          </Button>
        </section>
      )}

      {account.status === "signedIn" && (
        <>
          <div className={shared.group}>
            <div className={shared.groupRow}>
              <PixelIcon name="face" size={24} />
              <span className={styles.rowText}>
                <span className={styles.rowLabel}>{account.email}</span>
                <span className={styles.rowHint}>{account.google ? "Signed in with Google" : "Signed in with email"}</span>
              </span>
            </div>
            <div className={shared.groupRow}>
              <PixelIcon name={account.saving === "saved" ? "check" : "clock"} size={24} />
              <span className={styles.rowText}>
                <span className={styles.rowLabel}>{SAVING_TEXT[account.saving]}</span>
                <span className={styles.rowHint}>Your streak, coins, goals and Rilo&apos;s things</span>
              </span>
            </div>
          </div>

          {!account.verified && !account.google && (
            <section className={`${shared.card} ${styles.verify}`}>
              <span className={styles.rowLabel}>Verify your email</span>
              <p className={styles.rowHint}>
                We sent a link to {account.email}. It lets you reset your password if you ever forget it.
              </p>
              {resent ? (
                <span className={styles.rowHint}>Sent again. Check your spam folder too.</span>
              ) : (
                <Button size="small" variant="secondary" onClick={resend}>
                  Send it again
                </Button>
              )}
            </section>
          )}

          <Button full variant="secondary" onClick={() => setSheet("logout")}>
            Log out
          </Button>
          <Button variant="ghost" size="medium" onClick={() => setSheet("delete")}>
            Delete account
          </Button>
        </>
      )}

      <Sheet open={sheet === "logout"} onClose={close}>
        <div className={styles.sheetBody}>
          <Mascot mood="wave" size={96} />
          <h2>Log out?</h2>
          <p className={shared.muted}>
            Your progress stays in your account. This phone goes back to the start until you log in again.
          </p>
          {account.status === "signedIn" && account.saving === "offline" && (
            <p className={styles.warn}>You&apos;re offline, so your latest progress isn&apos;t saved yet. Connect first.</p>
          )}
          {error && <p className={styles.warn}>{error}</p>}
          <Button full disabled={busy} onClick={() => run(logOut)}>
            {busy ? "Logging out..." : "Log out"}
          </Button>
          <Button full variant="secondary" disabled={busy} onClick={close}>
            Stay logged in
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === "delete"} onClose={close}>
        <div className={styles.sheetBody}>
          <Mascot mood="sad" size={96} />
          <h2>Delete your account?</h2>
          <p className={shared.muted}>
            Your account, streak, coins and shop items are deleted for good, on every phone. This can&apos;t be undone.
          </p>
          {error && <p className={styles.warn}>{error}</p>}
          <Button full disabled={busy} onClick={() => run(deleteAccount)}>
            {busy ? "Deleting..." : "Yes, delete everything"}
          </Button>
          <Button full variant="secondary" disabled={busy} onClick={close}>
            Keep my account
          </Button>
        </div>
      </Sheet>
    </main>
  );
}
