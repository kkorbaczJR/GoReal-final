"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Button from "@/components/Button";
import Mascot from "@/components/Mascot";
import { CoinIcon } from "@/components/StatPills";
import { formatMinutes } from "@/lib/date";
import { SHOP_ITEMS, isOwned, titleName, type ShopItem } from "@/lib/shop";
import { buyOrEquip, useGoReal } from "@/lib/store";
import shared from "../tabs.module.css";
import styles from "./shop.module.css";

export default function Shop() {
  const s = useGoReal()!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selected = SHOP_ITEMS.find((i) => i.id === selectedId) ?? null;
  const previewOutfit = selected?.kind === "outfit" ? selected.outfit : s.outfit;
  const previewTitle = selected?.kind === "title" ? selected.id : s.title;

  const outfits = SHOP_ITEMS.filter((i) => i.kind === "outfit");
  const titles = SHOP_ITEMS.filter((i) => i.kind === "title");

  const owned = (item: ShopItem) => isOwned(item, s.owned, s.totalBreakMinutes);
  const wearing = (item: ShopItem) =>
    item.kind === "outfit" ? s.outfit === item.outfit : s.title === item.id;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const act = () => {
    if (!selected) return;
    const wasOwned = owned(selected);
    const wasWearing = wearing(selected);
    if (!buyOrEquip(selected.id)) {
      flash(`You need ${selected.price - s.coins} more coins`);
      return;
    }
    if (!wasOwned) flash(`${selected.name} is yours!`);
    else if (selected.kind === "outfit" && wasWearing) flash("Taken off");
  };

  let action = "Pick something";
  let disabled = !selected;
  if (selected) {
    if (!owned(selected)) {
      if (selected.kind === "title" && selected.unlockAtMinutes !== undefined) {
        action = `Unlocks at ${formatMinutes(selected.unlockAtMinutes)} of breaks`;
        disabled = true;
      } else {
        action = `Buy for ${selected.price}`;
      }
    } else if (wearing(selected)) {
      action = selected.kind === "outfit" ? "Take off" : "Using this title";
      disabled = selected.kind === "title";
    } else {
      action = selected.kind === "outfit" ? "Wear it" : "Use this title";
    }
  }

  return (
    <main className={shared.page}>
      <div className={shared.top}>
        <h1 className={shared.heading}>Shop</h1>
        <div className={styles.coins}>
          <CoinIcon size={20} /> {s.coins}
        </div>
      </div>

      <section className={styles.preview}>
        <Mascot mood="proud" size={150} outfit={previewOutfit} />
        <AnimatePresence mode="wait">
          <motion.span
            key={previewTitle}
            className={styles.title}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {s.name} · {titleName(previewTitle)}
          </motion.span>
        </AnimatePresence>
      </section>

      <section>
        <h2 className={shared.sectionTitle}>Outfits for Rilo</h2>
        <div className={styles.grid}>
          {outfits.map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.94 }}
              className={`${styles.item} ${selectedId === item.id ? styles.itemOn : ""}`}
              onClick={() => setSelectedId(item.id)}
            >
              {item.kind === "outfit" && <Mascot still size={64} outfit={item.outfit} />}
              <span className={styles.itemName}>{item.name}</span>
              <PriceTag item={item} owned={owned(item)} wearing={wearing(item)} />
            </motion.button>
          ))}
        </div>
      </section>

      <section>
        <h2 className={shared.sectionTitle}>Titles</h2>
        <div className={styles.list}>
          {titles.map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.98 }}
              className={`${styles.row} ${selectedId === item.id ? styles.itemOn : ""}`}
              onClick={() => setSelectedId(item.id)}
            >
              <span className={styles.rowName}>{item.name}</span>
              <PriceTag item={item} owned={owned(item)} wearing={wearing(item)} />
            </motion.button>
          ))}
        </div>
      </section>

      <div className={styles.actionBar}>
        <Button full variant={selected && !owned(selected) ? "accent" : "primary"} disabled={disabled} onClick={act}>
          {action}
        </Button>
      </div>

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

function PriceTag({ item, owned, wearing }: { item: ShopItem; owned: boolean; wearing: boolean }) {
  if (wearing) return <span className={`${styles.tag} ${styles.tagOn}`}>On</span>;
  if (owned) return <span className={styles.tag}>Owned</span>;
  if (item.kind === "title" && item.unlockAtMinutes !== undefined) {
    return <span className={styles.tag}>{formatMinutes(item.unlockAtMinutes)}</span>;
  }
  return (
    <span className={styles.tag}>
      <CoinIcon size={13} /> {item.price}
    </span>
  );
}
