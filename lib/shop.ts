export type Outfit =
  | "beanie"
  | "cap"
  | "flower"
  | "headphones"
  | "crown"
  | "party"
  | "bow"
  | "bunny"
  | "cat"
  | "chef"
  | "wizard"
  | "halo"
  | "bandana"
  | "viking"
  | "einstein";

export type Face = "shades" | "glasses" | "mustache" | "bandaid" | "scarf" | "bowtie";

export type Background = "sunny" | "hills" | "grid" | "checker" | "sunset" | "night" | "snow" | "pop";

export type Category = "hat" | "face" | "background" | "title";

export type ShopItem =
  | { id: string; kind: "hat"; look: Outfit; name: string; price: number }
  | { id: string; kind: "face"; look: Face; name: string; price: number }
  | { id: string; kind: "background"; look: Background; name: string; price: number }
  | { id: string; kind: "title"; name: string; price: number; unlockAtMinutes?: number };

/** Everything in the shop. Titles with `unlockAtMinutes` are free once you reach that many break minutes. */
export const SHOP_ITEMS: ShopItem[] = [
  { id: "outfit-beanie", kind: "hat", look: "beanie", name: "Cozy beanie", price: 40 },
  { id: "hat-bow", kind: "hat", look: "bow", name: "Big bow", price: 50 },
  { id: "hat-cat", kind: "hat", look: "cat", name: "Cat ears", price: 70 },
  { id: "outfit-flower", kind: "hat", look: "flower", name: "Little flower", price: 80 },
  { id: "hat-party", kind: "hat", look: "party", name: "Party hat", price: 90 },
  { id: "hat-bunny", kind: "hat", look: "bunny", name: "Bunny ears", price: 110 },
  { id: "outfit-cap", kind: "hat", look: "cap", name: "Sports cap", price: 120 },
  { id: "hat-bandana", kind: "hat", look: "bandana", name: "Pirate bandana", price: 140 },
  { id: "hat-chef", kind: "hat", look: "chef", name: "Chef hat", price: 160 },
  { id: "outfit-headphones", kind: "hat", look: "headphones", name: "Headphones", price: 180 },
  { id: "hat-einstein", kind: "hat", look: "einstein", name: "Einstein", price: 200 },
  { id: "hat-viking", kind: "hat", look: "viking", name: "Viking helmet", price: 220 },
  { id: "hat-wizard", kind: "hat", look: "wizard", name: "Wizard hat", price: 260 },
  { id: "hat-halo", kind: "hat", look: "halo", name: "Tiny halo", price: 320 },
  { id: "outfit-crown", kind: "hat", look: "crown", name: "Crown", price: 400 },

  { id: "face-bandaid", kind: "face", look: "bandaid", name: "Band-aid", price: 30 },
  { id: "face-mustache", kind: "face", look: "mustache", name: "Mustache", price: 50 },
  { id: "outfit-shades", kind: "face", look: "shades", name: "Cool shades", price: 60 },
  { id: "face-glasses", kind: "face", look: "glasses", name: "Round glasses", price: 70 },
  { id: "face-bowtie", kind: "face", look: "bowtie", name: "Bow tie", price: 90 },
  { id: "face-scarf", kind: "face", look: "scarf", name: "Warm scarf", price: 120 },

  { id: "bg-grid", kind: "background", look: "grid", name: "Graph paper", price: 40 },
  { id: "bg-checker", kind: "background", look: "checker", name: "Picnic", price: 60 },
  { id: "bg-sunny", kind: "background", look: "sunny", name: "Sunny day", price: 80 },
  { id: "bg-hills", kind: "background", look: "hills", name: "Hills", price: 100 },
  { id: "bg-snow", kind: "background", look: "snow", name: "Snow day", price: 150 },
  { id: "bg-sunset", kind: "background", look: "sunset", name: "Sunset", price: 180 },
  { id: "bg-night", kind: "background", look: "night", name: "Starry night", price: 220 },
  { id: "bg-pop", kind: "background", look: "pop", name: "Orange pop", price: 300 },

  { id: "title-rookie", kind: "title", name: "Rookie", price: 0 },
  { id: "title-grass", kind: "title", name: "Grass Toucher", price: 0, unlockAtMinutes: 60 },
  { id: "title-unplugged", kind: "title", name: "Unplugged", price: 0, unlockAtMinutes: 300 },
  { id: "title-legend", kind: "title", name: "Offline Legend", price: 0, unlockAtMinutes: 1000 },
  { id: "title-mythic", kind: "title", name: "Phone Who?", price: 0, unlockAtMinutes: 2500 },
  { id: "title-battery", kind: "title", name: "Battery Saver", price: 40 },
  { id: "title-zen", kind: "title", name: "Zen Mode", price: 50 },
  { id: "title-pixel", kind: "title", name: "Pixel Pal", price: 60 },
  { id: "title-sunset", kind: "title", name: "Sunset Chaser", price: 70 },
  { id: "title-sky", kind: "title", name: "Cloud Watcher", price: 90 },
  { id: "title-dnd", kind: "title", name: "Do Not Disturb", price: 110 },
  { id: "title-analog", kind: "title", name: "Analog Kid", price: 130 },
  { id: "title-boss", kind: "title", name: "Focus Boss", price: 150 },
  { id: "title-lowbat", kind: "title", name: "Low Battery, High Life", price: 200 },
  { id: "title-main", kind: "title", name: "Main Character", price: 300 },
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
