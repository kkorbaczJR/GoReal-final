"use client";

import { useEffect, useId, useRef, useState } from "react";
import { onBack } from "@/lib/back";
import { pickShareLine, streakLabel } from "@/lib/shareCopy";
import { generateShareImage, shareImage, type ShareFormat, type ShareOutfit } from "@/lib/shareCard";
import Button from "./Button";
import styles from "./ShareSheet.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  streak: number;
  outfit: ShareOutfit;
};

type Draft = { id: number; line: string; format: ShareFormat };
type Drawn = { key: string; blob: Blob; url: string };

/** Preview of the streak card, then the device share sheet or a download. */
export default function ShareSheet({ open, onClose, streak, outfit }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<string | null>(null);
  const [seenOpen, setSeenOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (open !== seenOpen) {
    setSeenOpen(open);
    if (open) {
      setDraft({ id: (draft?.id ?? 0) + 1, line: pickShareLine(), format: "story" });
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
  const key = draft ? `${draft.id}:${draft.format}` : "";
  const ready = drawn && drawn.key === key ? drawn : null;

  useEffect(() => {
    if (!draft) return;
    const drawKey = `${draft.id}:${draft.format}`;
    let cancel = false;
    // flushSync cannot run inside this effect, so the draw starts on the next turn.
    const timer = window.setTimeout(() => {
      generateShareImage({
        streak,
        outfit: { outfit: hat, face, neck, back },
        format: draft.format,
        line: draft.line,
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
  }, [draft, streak, hat, face, neck, back]);

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
    const result = await shareImage(ready.blob, `${streakLabel(streak)}. ${draft.line}`);
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
          <img className={styles.preview} src={ready.url} alt={`${streakLabel(streak)}. ${draft.line}`} />
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
