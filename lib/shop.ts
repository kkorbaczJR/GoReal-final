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
  | "einstein"
  | "tophat"
  | "cowboy"
  | "graduation"
  | "captain"
  | "antennae";

export type Face =
  | "shades"
  | "glasses"
  | "mustache"
  | "bandaid"
  | "scarf"
  | "bowtie"
  | "freckles"
  | "eyepatch"
  | "monocle"
  | "star";

export type Background =
  | "sunny"
  | "hills"
  | "grid"
  | "checker"
  | "sunset"
  | "night"
  | "snow"
  | "pop"
  | "beach"
  | "forest"
  | "city"
  | "space";

export type Accent = "red" | "orange" | "yellow" | "green" | "blue" | "indigo" | "violet";

export type Category = "hat" | "face" | "background" | "title" | "color" | "streak";

export type ShopItem =
  | { id: string; kind: "hat"; look: Outfit; name: string; price: number }
  | { id: string; kind: "face"; look: Face; name: string; price: number }
  | { id: string; kind: "background"; look: Background; name: string; price: number }
  | { id: string; kind: "title"; name: string; price: number; unlockAtMinutes?: number }
  | { id: string; kind: "color"; look: Accent; name: string; price: number }
  | { id: string; kind: "freeze"; name: string; price: number };

export const DEFAULT_ACCENT: Accent = "orange";
export const ACCENT_PRICE = 100;

export type AccentColors = {
  /** Buttons, switches, progress and highlights. */
  accent: string;
  /** Pressed buttons and small accent text on white. */
  deep: string;
  /** Pale backgrounds behind accent text. */
  soft: string;
  /** Text and icons drawn on top of `accent`. */
  onAccent: string;
  /** Big accent-coloured text on white. The accent itself, except yellow, which needs a darker one. */
  text: string;
  /** Rilo's cheeks and the inside of his cat and bunny ears: the accent mixed with white. */
  blush: string;
};

/**
 * The orange of the app and six more, in rainbow order. The accent and Rilo change: the white and black
 * and the app icon stay as they are. Yellow is the one with dark text on top, white on yellow is unreadable.
 */
export const ACCENT_COLORS: Record<Accent, AccentColors> = {
  red: { accent: "#dc2626", deep: "#b91c1c", soft: "#fdecec", onAccent: "#ffffff", text: "#dc2626", blush: "#ef9d9d" },
  orange: { accent: "#fc4c02", deep: "#e03e00", soft: "#fff0e8", onAccent: "#ffffff", text: "#fc4c02", blush: "#ffb08a" },
  yellow: { accent: "#facc15", deep: "#a16207", soft: "#fef9c3", onAccent: "#111111", text: "#a16207", blush: "#fde896" },
  green: { accent: "#16a34a", deep: "#15803d", soft: "#e3f6e9", onAccent: "#ffffff", text: "#16a34a", blush: "#96d6ae" },
  blue: { accent: "#2563eb", deep: "#1d4ed8", soft: "#e3ecfd", onAccent: "#ffffff", text: "#2563eb", blush: "#9db9f6" },
  indigo: { accent: "#4f46e5", deep: "#4338ca", soft: "#e8e8fd", onAccent: "#ffffff", text: "#4f46e5", blush: "#b0acf3" },
  violet: { accent: "#9333ea", deep: "#7e22ce", soft: "#f2e8fd", onAccent: "#ffffff", text: "#9333ea", blush: "#cea3f6" },
};

export function isAccent(value: unknown): value is Accent {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ACCENT_COLORS, value);
}

/** A freeze saves a streak when you miss a day. You can hold two. */
export const FREEZE_PRICE = 250;

/**
 * Everything in the shop, cheapest first inside each group. At the default 30 minute goal a day
 * earns about 36 coins, so cheap things take a few days and the best things take months.
 * Titles with `unlockAtMinutes` are free once you reach that many break minutes.
 */
export const SHOP_ITEMS: ShopItem[] = [
  { id: "outfit-beanie", kind: "hat", look: "beanie", name: "Cozy beanie", price: 150 },
  { id: "hat-bow", kind: "hat", look: "bow", name: "Big bow", price: 180 },
  { id: "hat-cat", kind: "hat", look: "cat", name: "Cat ears", price: 250 },
  { id: "outfit-flower", kind: "hat", look: "flower", name: "Little flower", price: 300 },
  { id: "hat-party", kind: "hat", look: "party", name: "Party hat", price: 350 },
  { id: "hat-antennae", kind: "hat", look: "antennae", name: "Antennae", price: 400 },
  { id: "hat-bunny", kind: "hat", look: "bunny", name: "Bunny ears", price: 450 },
  { id: "outfit-cap", kind: "hat", look: "cap", name: "Sports cap", price: 500 },
  { id: "hat-bandana", kind: "hat", look: "bandana", name: "Pirate bandana", price: 600 },
  { id: "hat-graduation", kind: "hat", look: "graduation", name: "Graduation cap", price: 700 },
  { id: "hat-chef", kind: "hat", look: "chef", name: "Chef hat", price: 750 },
  { id: "outfit-headphones", kind: "hat", look: "headphones", name: "Headphones", price: 800 },
  { id: "hat-tophat", kind: "hat", look: "tophat", name: "Top hat", price: 900 },
  { id: "hat-captain", kind: "hat", look: "captain", name: "Captain's cap", price: 1000 },
  { id: "hat-einstein", kind: "hat", look: "einstein", name: "Einstein", price: 1200 },
  { id: "hat-cowboy", kind: "hat", look: "cowboy", name: "Cowboy hat", price: 1300 },
  { id: "hat-viking", kind: "hat", look: "viking", name: "Viking helmet", price: 1400 },
  { id: "hat-wizard", kind: "hat", look: "wizard", name: "Wizard hat", price: 1800 },
  { id: "hat-halo", kind: "hat", look: "halo", name: "Tiny halo", price: 2500 },
  { id: "outfit-crown", kind: "hat", look: "crown", name: "Crown", price: 4000 },

  { id: "face-freckles", kind: "face", look: "freckles", name: "Freckles", price: 80 },
  { id: "face-bandaid", kind: "face", look: "bandaid", name: "Band-aid", price: 100 },
  { id: "face-mustache", kind: "face", look: "mustache", name: "Mustache", price: 200 },
  { id: "outfit-shades", kind: "face", look: "shades", name: "Cool shades", price: 300 },
  { id: "face-glasses", kind: "face", look: "glasses", name: "Round glasses", price: 350 },
  { id: "face-eyepatch", kind: "face", look: "eyepatch", name: "Eyepatch", price: 400 },
  { id: "face-star", kind: "face", look: "star", name: "Star sticker", price: 450 },
  { id: "face-bowtie", kind: "face", look: "bowtie", name: "Bow tie", price: 500 },
  { id: "face-monocle", kind: "face", look: "monocle", name: "Monocle", price: 600 },
  { id: "face-scarf", kind: "face", look: "scarf", name: "Warm scarf", price: 700 },

  { id: "bg-grid", kind: "background", look: "grid", name: "Graph paper", price: 200 },
  { id: "bg-checker", kind: "background", look: "checker", name: "Picnic", price: 300 },
  { id: "bg-sunny", kind: "background", look: "sunny", name: "Sunny day", price: 500 },
  { id: "bg-beach", kind: "background", look: "beach", name: "Beach", price: 600 },
  { id: "bg-hills", kind: "background", look: "hills", name: "Hills", price: 700 },
  { id: "bg-forest", kind: "background", look: "forest", name: "Pine forest", price: 850 },
  { id: "bg-snow", kind: "background", look: "snow", name: "Snow day", price: 1000 },
  { id: "bg-city", kind: "background", look: "city", name: "City lights", price: 1200 },
  { id: "bg-sunset", kind: "background", look: "sunset", name: "Sunset", price: 1400 },
  { id: "bg-night", kind: "background", look: "night", name: "Starry night", price: 2000 },
  { id: "bg-space", kind: "background", look: "space", name: "Outer space", price: 2500 },
  { id: "bg-pop", kind: "background", look: "pop", name: "Orange pop", price: 3000 },

  { id: "title-rookie", kind: "title", name: "Rookie", price: 0 },
  { id: "title-grass", kind: "title", name: "Grass Toucher", price: 0, unlockAtMinutes: 60 },
  { id: "title-unplugged", kind: "title", name: "Unplugged", price: 0, unlockAtMinutes: 300 },
  { id: "title-legend", kind: "title", name: "Offline Legend", price: 0, unlockAtMinutes: 1000 },
  { id: "title-mythic", kind: "title", name: "Phone Who?", price: 0, unlockAtMinutes: 2500 },
  { id: "title-monk", kind: "title", name: "Phone Monk", price: 0, unlockAtMinutes: 6000 },
  { id: "title-battery", kind: "title", name: "Battery Saver", price: 150 },
  { id: "title-zen", kind: "title", name: "Zen Mode", price: 200 },
  { id: "title-pixel", kind: "title", name: "Pixel Pal", price: 250 },
  { id: "title-sunset", kind: "title", name: "Sunset Chaser", price: 300 },
  { id: "title-airplane", kind: "title", name: "Airplane Mode", price: 350 },
  { id: "title-sky", kind: "title", name: "Cloud Watcher", price: 400 },
  { id: "title-dnd", kind: "title", name: "Do Not Disturb", price: 500 },
  { id: "title-ninja", kind: "title", name: "Notification Ninja", price: 600 },
  { id: "title-analog", kind: "title", name: "Analog Kid", price: 650 },
  { id: "title-boss", kind: "title", name: "Focus Boss", price: 800 },
  { id: "title-detox", kind: "title", name: "Dopamine Detox", price: 1000 },
  { id: "title-lowbat", kind: "title", name: "Low Battery, High Life", price: 1200 },
  { id: "title-doom", kind: "title", name: "Doomscroll Survivor", price: 1500 },
  { id: "title-main", kind: "title", name: "Main Character", price: 2000 },
  { id: "title-friend", kind: "title", name: "Rilo's Best Friend", price: 3000 },

  { id: "color-red", kind: "color", look: "red", name: "Red", price: ACCENT_PRICE },
  { id: "color-orange", kind: "color", look: "orange", name: "Orange", price: 0 },
  { id: "color-yellow", kind: "color", look: "yellow", name: "Yellow", price: ACCENT_PRICE },
  { id: "color-green", kind: "color", look: "green", name: "Green", price: ACCENT_PRICE },
  { id: "color-blue", kind: "color", look: "blue", name: "Blue", price: ACCENT_PRICE },
  { id: "color-indigo", kind: "color", look: "indigo", name: "Indigo", price: ACCENT_PRICE },
  { id: "color-violet", kind: "color", look: "violet", name: "Violet", price: ACCENT_PRICE },

  { id: "streak-freeze", kind: "freeze", name: "Streak freeze", price: FREEZE_PRICE },
];

export const DEFAULT_TITLE = "title-rookie";

export function itemById(id: string | null | undefined): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

export function titleName(id: string): string {
  return itemById(id)?.name ?? "Rookie";
}

/** Owned = bought, free, or unlocked by total break minutes. Freezes are used up, never owned. */
export function isOwned(item: ShopItem, owned: string[], totalBreakMinutes: number): boolean {
  if (item.kind === "freeze") return false;
  if (owned.includes(item.id)) return true;
  if (item.kind === "color") return item.price === 0;
  if (item.kind === "title") {
    if (item.unlockAtMinutes !== undefined) return totalBreakMinutes >= item.unlockAtMinutes;
    return item.price === 0;
  }
  return false;
}
