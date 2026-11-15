"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Mascot from "@/components/Mascot";
import { PixelIcon } from "@/components/PixelIcon";
import Sheet from "@/components/Sheet";
import { deleteAccount, logOut, reloadUser, resendVerification, useAccount } from "@/lib/account";
import { useCopy } from "@/lib/i18n";
import shared from "../tabs.module.css";
import styles from "./account.module.css";

export default function AccountPage() {
  const { c } = useCopy();
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
    if (result !== null) return setError(result || c.somethingWrong);
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
        <button className={styles.back} onClick={() => router.back()} aria-label={c.back}>
          <PixelIcon name="chevronLeft" size={18} />
          <span>{c.back}</span>
        </button>
      </div>

      <h1 className={shared.heading}>{c.account}</h1>

      {account.status === "loading" && <p className={shared.muted}>{c.checking}</p>}

      {account.status === "signedOut" && (
        <section className={`${shared.card} ${styles.invite}`}>
          <Mascot mood="happy" size={96} />
          <h2 className={styles.inviteTitle}>{c.saveProgress}</h2>
          <p className={styles.inviteText}>{c.saveProgressBody}</p>
          <Button full onClick={() => router.push("/signup")}>
            {c.createAccount}
          </Button>
          <Button full variant="secondary" onClick={() => router.push("/login")}>
            {c.logIn}
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
                <span className={styles.rowHint}>{account.google ? c.signedGoogle : c.signedEmail}</span>
              </span>
            </div>
            <div className={shared.groupRow}>
              <PixelIcon name={account.saving === "saved" ? "check" : "clock"} size={24} />
              <span className={styles.rowText}>
                <span className={styles.rowLabel}>
                  {account.saving === "saved" ? c.savingSaved : account.saving === "saving" ? c.saving : c.savingOffline}
                </span>
                <span className={styles.rowHint}>{c.savingHint}</span>
              </span>
            </div>
          </div>

          {!account.verified && !account.google && (
            <section className={`${shared.card} ${styles.verify}`}>
              <span className={styles.rowLabel}>{c.verify}</span>
              <p className={styles.rowHint}>{c.verifyBody(account.email)}</p>
              {resent ? (
                <span className={styles.rowHint}>{c.sentAgain}</span>
              ) : (
                <Button size="small" variant="secondary" onClick={resend}>
                  {c.sendAgain}
                </Button>
              )}
            </section>
          )}

          <Button full variant="secondary" onClick={() => setSheet("logout")}>
            {c.logOut}
          </Button>
          <Button variant="ghost" size="medium" onClick={() => setSheet("delete")}>
            {c.deleteAccount}
          </Button>
        </>
      )}

      <Sheet open={sheet === "logout"} onClose={close}>
        <div className={styles.sheetBody}>
          <Mascot mood="wave" size={96} />
          <h2>{c.logOutAsk}</h2>
          <p className={shared.muted}>{c.logOutBody}</p>
          {account.status === "signedIn" && account.saving === "offline" && (
            <p className={styles.warn}>{c.offlineWarn}</p>
          )}
          {error && <p className={styles.warn}>{error}</p>}
          <Button full disabled={busy} onClick={() => run(logOut)}>
            {busy ? c.loggingOut : c.logOut}
          </Button>
          <Button full variant="secondary" disabled={busy} onClick={close}>
            {c.stay}
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === "delete"} onClose={close}>
        <div className={styles.sheetBody}>
          <Mascot mood="sad" size={96} />
          <h2>{c.deleteAsk}</h2>
          <p className={shared.muted}>{c.deleteBody}</p>
          {error && <p className={styles.warn}>{error}</p>}
          <Button full disabled={busy} onClick={() => run(deleteAccount)}>
            {busy ? c.deleting : c.yesDelete}
          </Button>
          <Button full variant="secondary" disabled={busy} onClick={close}>
            {c.keepAccount}
          </Button>
        </div>
      </Sheet>
    </main>
  );
}
