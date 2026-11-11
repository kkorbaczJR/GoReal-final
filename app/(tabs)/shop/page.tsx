"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { applyAccent } from "@/components/AccentTheme";
import Button from "@/components/Button";
import Mascot from "@/components/Mascot";
import { PixelIcon, type PixelIconName } from "@/components/PixelIcon";
import PixelScene from "@/components/PixelScene";
import RiloStage from "@/components/RiloStage";
import { formatMinutes } from "@/lib/date";
import { MAX_FREEZES } from "@/lib/rules";
import { ACCENT_COLORS, SHOP_ITEMS, isOwned, titleName, type Category, type ShopItem } from "@/lib/shop";
import { buyFreeze, buyOrEquip, useGoReal, type GoRealState } from "@/lib/store";
import shared from "../tabs.module.css";
import styles from "./shop.module.css";

const CATEGORIES: { id: Category; label: string; icon: PixelIconName }[] = [
  { id: "hat", label: "Hats", icon: "hat" },
  { id: "face", label: "Extras", icon: "glasses" },
  { id: "back", label: "Back", icon: "wings" },
  { id: "aura", label: "Aura", icon: "sparkle" },
  { id: "background", label: "Scenes", icon: "picture" },
  { id: "title", label: "Titles", icon: "badge" },
  { id: "color", label: "Colors", icon: "palette" },
  { id: "streak", label: "Streak", icon: "snowflake" },
];

function isWearing(item: ShopItem, s: GoRealState) {
  switch (item.kind) {
    case "hat":
      return s.outfit === item.look;
    case "face":
      return s.face === item.look;
    case "neck":
      return s.neck === item.look;
    case "back":
      return s.back === item.look;
    case "aura":
      return s.aura === item.look;
    case "buddy":
      return s.buddy === item.look;
    case "background":
      return s.background === item.look;
    case "title":
      return s.title === item.id;
    case "color":
      return s.accent === item.look;
    case "freeze":
      return false;
  }
}

export default function Shop() {
  const s = useGoReal()!;
  const [category, setCategory] = useState<Category>("hat");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selected =
    category === "streak"
      ? (SHOP_ITEMS.find((i) => i.kind === "freeze") ?? null)
      : (SHOP_ITEMS.find((i) => i.id === selectedId) ?? null);
  const preview = {
    outfit: selected?.kind === "hat" ? selected.look : s.outfit,
    face: selected?.kind === "face" ? selected.look : s.face,
    neck: selected?.kind === "neck" ? selected.look : s.neck,
    back: selected?.kind === "back" ? selected.look : s.back,
    aura: selected?.kind === "aura" ? selected.look : s.aura,
    buddy: selected?.kind === "buddy" ? selected.look : s.buddy,
    background: selected?.kind === "background" ? selected.look : s.background,
    title: selected?.kind === "title" ? selected.id : s.title,
  };

  const previewAccent = selected?.kind === "color" ? selected.look : null;
  // Looking at a colour shows it on the whole app. It goes back to the saved one when you look at something else.
  useEffect(() => {
    if (!previewAccent) return;
    applyAccent(previewAccent);
    return () => applyAccent(s.accent);
  }, [previewAccent, s.accent]);

  const items = SHOP_ITEMS.filter((i) => {
    if (category === "face") return i.kind === "face" || i.kind === "neck";
    if (category === "aura") return i.kind === "aura" || i.kind === "buddy";
    return i.kind === category;
  });
  const owned = (item: ShopItem) => isOwned(item, s.owned, s.totalBreakMinutes);
  const wearing = (item: ShopItem) => isWearing(item, s);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const act = () => {
    if (!selected) return;
    if (selected.kind === "freeze") {
      const result = buyFreeze();
      if (result === "ok") flash("Freeze added. It will save a missed day.");
      else if (result === "full") flash(`You already hold ${MAX_FREEZES}`);
      else flash(`You need ${selected.price - s.coins} more coins`);
      return;
    }
    const wasOwned = owned(selected);
    const wasWearing = wearing(selected);
    if (!buyOrEquip(selected.id)) {
      flash(`You need ${selected.price - s.coins} more coins`);
      return;
    }
    if (!wasOwned) flash(`${selected.name} is yours!`);
    else if (selected.kind !== "title" && selected.kind !== "color" && wasWearing) flash("Taken off");
  };

  let action = "";
  let disabled = false;
  if (selected?.kind === "freeze") {
    if (s.freezes >= MAX_FREEZES) {
      action = `You hold the maximum (${MAX_FREEZES})`;
      disabled = true;
    } else {
      action = `Buy a freeze for ${selected.price}`;
    }
  } else if (selected) {
    if (!owned(selected)) {
      if (selected.kind === "title" && selected.unlockAtMinutes !== undefined) {
        action = `Unlocks at ${formatMinutes(selected.unlockAtMinutes)} of breaks`;
        disabled = true;
      } else {
        action = `Buy for ${selected.price}`;
      }
    } else if (wearing(selected)) {
      action =
        selected.kind === "title"
          ? "Using this title"
          : selected.kind === "color"
            ? "Using this colour"
            : selected.kind === "background"
              ? "Remove"
              : "Take off";
      disabled = selected.kind === "title" || selected.kind === "color";
    } else {
      action =
        selected.kind === "title"
          ? "Use this title"
          : selected.kind === "color"
            ? "Use this colour"
            : selected.kind === "background"
              ? "Use it"
              : "Wear it";
    }
  }

  return (
    <main className={shared.page}>
      <div className={shared.top}>
        <h1 className={shared.heading}>Shop</h1>
        <div className={styles.coins}>
          <PixelIcon name="coin" size={24} /> {s.coins}
        </div>
      </div>

      <section className={styles.preview}>
        <RiloStage
          outfit={preview.outfit}
          face={preview.face}
          neck={preview.neck}
          back={preview.back}
          aura={preview.aura}
          buddy={preview.buddy}
          background={preview.background}
          size={130}
          height={210}
        />
        <AnimatePresence mode="wait">
          <motion.span
            key={preview.title}
            className={styles.title}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {titleName(preview.title)}
          </motion.span>
        </AnimatePresence>
      </section>

      <div className={styles.tabs} role="tablist">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={category === c.id}
            className={`${styles.tab} ${category === c.id ? styles.tabOn : ""}`}
            onClick={() => {
              setCategory(c.id);
              setSelectedId(null);
            }}
          >
            {category === c.id && (
              <motion.span
                layoutId="shop-tab"
                className={styles.tabPill}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className={styles.tabInner}>
              <PixelIcon name={c.icon} size={24} />
              {c.label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={category}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {category === "streak" ? (
            <FreezeCard freezes={s.freezes} price={SHOP_ITEMS.find((i) => i.kind === "freeze")?.price ?? 0} />
          ) : category === "title" ? (
            <div className={styles.list}>
              {items.map((item) => (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.98 }}
                  className={`${styles.row} ${selectedId === item.id ? styles.rowOn : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className={styles.rowName}>{item.name}</span>
                  <PriceTag item={item} owned={owned(item)} wearing={wearing(item)} />
                </motion.button>
              ))}
            </div>
          ) : (
            <div className={styles.grid}>
              {items.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.025, type: "spring", stiffness: 420, damping: 24 }}
                  whileTap={{ scale: 0.94 }}
                  className={`${styles.item} ${selectedId === item.id ? styles.itemOn : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className={styles.thumb}>
                    {item.kind === "color" ? (
                      <span className={styles.swatch} style={{ background: ACCENT_COLORS[item.look].accent }} />
                    ) : item.kind === "background" ? (
                      <PixelScene scene={item.look} className={styles.thumbScene} />
                    ) : (
                      <Mascot
                        still={item.kind !== "buddy"}
                        size={78}
                        outfit={item.kind === "hat" ? item.look : null}
                        face={item.kind === "face" ? item.look : null}
                        neck={item.kind === "neck" ? item.look : null}
                        back={item.kind === "back" ? item.look : null}
                        aura={item.kind === "aura" ? item.look : null}
                        buddy={item.kind === "buddy" ? item.look : null}
                      />
                    )}
                  </span>
                  <span className={styles.itemName}>{item.name}</span>
                  <PriceTag item={item} owned={owned(item)} wearing={wearing(item)} />
                </motion.button>
              ))}
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <motion.div
            className={styles.actionBar}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <Button full variant={!owned(selected) ? "accent" : "primary"} disabled={disabled} onClick={act}>
              {action}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function FreezeCard({ freezes, price }: { freezes: number; price: number }) {
  return (
    <div className={styles.freezeCard}>
      <div className={styles.freezeSlots} aria-label={`${freezes} of ${MAX_FREEZES} freezes`}>
        {Array.from({ length: MAX_FREEZES }, (_, i) => (
          <span key={i} className={`${styles.freezeSlot} ${i < freezes ? styles.freezeSlotOn : ""}`}>
            <PixelIcon name="snowflake" size={48} dim={i >= freezes} />
          </span>
        ))}
      </div>
      <h2 className={styles.freezeTitle}>Streak freeze</h2>
      <p className={styles.freezeText}>
        Miss a whole day and a freeze covers it, so your streak keeps going. It is used on its own the next time you
        open the app. You can hold {MAX_FREEZES}.
      </p>
      <span className={styles.freezePrice}>
        <PixelIcon name="coin" size={12} /> {price} each, {freezes} of {MAX_FREEZES} in stock
      </span>
    </div>
  );
}

function PriceTag({ item, owned, wearing }: { item: ShopItem; owned: boolean; wearing: boolean }) {
  if (item.kind === "freeze") return null;
  if (wearing) {
    const label = item.kind === "title" || item.kind === "background" || item.kind === "color" ? "In use" : "Wearing";
    return <span className={`${styles.tag} ${styles.tagOn}`}>{label}</span>;
  }
  if (owned) return <span className={styles.tag}>Owned</span>;
  if (item.kind === "title" && item.unlockAtMinutes !== undefined) {
    return (
      <span className={styles.tag}>
        <PixelIcon name="lock" size={12} /> {formatMinutes(item.unlockAtMinutes)}
      </span>
    );
  }
  return (
    <span className={styles.tag}>
      <PixelIcon name="coin" size={12} /> {item.price}
    </span>
  );
}
