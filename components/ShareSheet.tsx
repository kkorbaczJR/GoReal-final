"use client";

import { useEffect, useId, useRef, useState } from "react";
import { onBack } from "@/lib/back";
import { streakLabel } from "@/lib/shareCopy";
import { generateShareImage, shareImage, type ShareFormat, type ShareOutfit } from "@/lib/shareCard";
import type { ShareDetails } from "@/lib/shareStreak";
import Button from "./Button";
import styles from "./ShareSheet.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  details: ShareDetails;
  outfit: ShareOutfit;
};

type Draft = { id: number; format: ShareFormat };
type Drawn = { key: string; blob: Blob; url: string };

function pictureKey(details: ShareDetails) {
  const week = details.week.map((day) => `${day.label}${day.mark}${day.today ? "t" : ""}`).join("");
  return `${details.count}|${details.line}|${details.bestLabel}|${details.limitLabel}|${details.freezeLabel}|${week}`;
}

/** Preview of the streak card, then the device share sheet or a download. */
export default function ShareSheet({ open, onClose, details, outfit }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<string | null>(null);
  const [seenOpen, setSeenOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const cardKey = pictureKey(details);
  const [picture, setPicture] = useState(details);
  const [pictureKeySeen, setPictureKeySeen] = useState(cardKey);
  if (cardKey !== pictureKeySeen) {
    setPictureKeySeen(cardKey);
    setPicture(details);
  }

  if (open !== seenOpen) {
    setSeenOpen(open);
    if (open) {
      setDraft({ id: (draft?.id ?? 0) + 1, format: "story" });
      setPicture(details);
      setDrawn(null);
      setError(null);
      setToast(null);
    } else if (draft) {
      setDraft(null);
    }
  }

  const hat = outfit.outfit;
  const face = outfit.face;
  const neck = outfit.neck;
  const back = outfit.back;
  const aura = outfit.aura;
  const buddy = outfit.buddy;
  const key = draft ? `${draft.id}:${draft.format}` : "";
  const ready = drawn && drawn.key === key ? drawn : null;

  useEffect(() => {
    if (!draft) return;
    const drawKey = `${draft.id}:${draft.format}`;
    let cancel = false;
    // flushSync cannot run inside this effect, so the draw starts on the next turn.
    const timer = window.setTimeout(() => {
      generateShareImage({
        details: picture,
        outfit: { outfit: hat, face, neck, back, aura, buddy },
        format: draft.format,
      })
        .then((blob) => {
          if (cancel) return;
          const url = URL.createObjectURL(blob);
          if (previewRef.current) URL.revokeObjectURL(previewRef.current);
          previewRef.current = url;
          setDrawn({ key: drawKey, blob, url });
          setError(null);
        })
        .catch(() => {
          if (!cancel) setError("Couldn't make that image. Try again.");
        });
    }, 0);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [draft, picture, hat, face, neck, back, aura, buddy]);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    if (!root) return;
    const removeBack = onBack(onClose);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () =>
      [...root.querySelectorAll<HTMLElement>("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")];
    const timer = window.setTimeout(() => focusable()[0]?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const list = focusable();
      if (list.length === 0) {
        event.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !root.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      removeBack();
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open || !draft) return null;

  const share = async () => {
    if (!ready) return;
    setToast(null);
    const result = await shareImage(ready.blob, `${streakLabel(picture.count)}. ${picture.line}`);
    if (result.kind === "cancelled") return;
    if (result.kind === "shared") {
      onClose();
      return;
    }
    setToast(result.copied ? "Link copied" : "Image saved");
    window.setTimeout(() => setToast(null), 1800);
  };

  return (
    <div className={styles.root}>
      <div className={styles.backdrop} onClick={onClose} />
      <div ref={dialogRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className={styles.title}>
          Share your streak
        </h2>
        <div className={styles.toggle} role="group" aria-label="Image shape">
          <button
            type="button"
            aria-pressed={draft.format === "story"}
            onClick={() => setDraft({ ...draft, format: "story" })}
          >
            Story
          </button>
          <button
            type="button"
            aria-pressed={draft.format === "square"}
            onClick={() => setDraft({ ...draft, format: "square" })}
          >
            Square
          </button>
        </div>
        {ready ? (
          // The card is a blob we just drew. next/image cannot load that.
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.preview} src={ready.url} alt={`${streakLabel(picture.count)}. ${picture.line}`} />
        ) : (
          <div className={styles.placeholder}>{error ?? "Drawing your card..."}</div>
        )}
        <div className={styles.actions}>
          <Button full onClick={share} disabled={!ready} aria-label="Share streak image">
            Share
          </Button>
          <Button variant="secondary" full onClick={onClose}>
            Close
          </Button>
        </div>
        {toast && (
          <p className={styles.toast} role="status">
            {toast}
          </p>
        )}
      </div>
    </div>
  );
}
