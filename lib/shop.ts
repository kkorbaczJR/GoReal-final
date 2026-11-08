export type Outfit = "beanie" | "shades" | "headphones" | "flower" | "cap" | "crown";

export type ShopItem =
  | { id: string; kind: "outfit"; outfit: Outfit; name: string; price: number }
  | { id: string; kind: "title"; name: string; price: number; unlockAtMinutes?: number };

/** Everything in the shop. Titles with `unlockAtMinutes` are free once you reach that many break minutes. */
export const SHOP_ITEMS: ShopItem[] = [
  { id: "outfit-beanie", kind: "outfit", outfit: "beanie", name: "Cozy beanie", price: 40 },
  { id: "outfit-shades", kind: "outfit", outfit: "shades", name: "Cool shades", price: 60 },
  { id: "outfit-flower", kind: "outfit", outfit: "flower", name: "Little flower", price: 80 },
  { id: "outfit-cap", kind: "outfit", outfit: "cap", name: "Sports cap", price: 120 },
  { id: "outfit-headphones", kind: "outfit", outfit: "headphones", name: "Headphones", price: 180 },
  { id: "outfit-crown", kind: "outfit", outfit: "crown", name: "Golden crown", price: 400 },

  { id: "title-rookie", kind: "title", name: "Rookie", price: 0 },
  { id: "title-grass", kind: "title", name: "Grass Toucher", price: 0, unlockAtMinutes: 60 },
  { id: "title-unplugged", kind: "title", name: "Unplugged", price: 0, unlockAtMinutes: 300 },
  { id: "title-legend", kind: "title", name: "Offline Legend", price: 0, unlockAtMinutes: 1000 },
  { id: "title-zen", kind: "title", name: "Zen Mode", price: 50 },
  { id: "title-sky", kind: "title", name: "Cloud Watcher", price: 90 },
  { id: "title-boss", kind: "title", name: "Focus Boss", price: 150 },
];

export const DEFAULT_TITLE = "title-rookie";

export function itemById(id: string | null | undefined): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

export function titleName(id: string): string {
  return itemById(id)?.name ?? "Rookie";
}

/** Owned = bought, free, or unlocked by total break minutes. */
export function isOwned(item: ShopItem, owned: string[], totalBreakMinutes: number): boolean {
  if (owned.includes(item.id)) return true;
  if (item.kind === "title") {
    if (item.unlockAtMinutes !== undefined) return totalBreakMinutes >= item.unlockAtMinutes;
    return item.price === 0;
  }
  return false;
}
