"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import type { Face, Outfit } from "@/lib/shop";

export type Mood = "happy" | "wave" | "tired" | "sleeping" | "proud" | "sad";

type Props = {
  mood?: Mood;
  outfit?: Outfit | null;
  face?: Face | null;
  size?: number;
  /** Rilo on a dark background (break mode): the floating z's turn light. */
  onDark?: boolean;
  /** Turn off idle motion (for small thumbnails). */
  still?: boolean;
};

/** Rilo is the app's accent color (orange unless another color was picked in the shop). */
const CLAY = "var(--accent, #fc4c02)";
const INK = "#111111";
const BLUSH = "var(--accent-blush, #ffb08a)";
const CREAM = "#ffffff";
const SAND = "#ebebeb";
const GRAY = "#9a9a9a";
const HAIR = "#c4c4c4";
const HAIR_DARK = "#8d8d8d";
const TAN = "#ffd2bd";
const FRECKLE = "var(--accent-deep, #9c2c00)";
const CAP_BASE = "#444444";

type Px = [x: number, y: number, color: string];

/** Fill a horizontal run of pixels. */
function run(y: number, x0: number, x1: number, color: string): Px[] {
  const out: Px[] = [];
  for (let x = x0; x <= x1; x++) out.push([x, y, color]);
  return out;
}

const BODY_ROWS: [number, number][] = [
  [4, 11], [2, 13], [1, 14], [0, 15], [0, 15], [0, 15], [0, 15],
  [0, 15], [0, 15], [0, 15], [0, 15], [1, 14], [2, 13],
];

const BODY: Px[] = BODY_ROWS.flatMap(([x0, x1], y) => run(y, x0, x1, CLAY));

const OUTFITS: Record<Outfit, Px[]> = {
  beanie: [
    ...run(-6, 7, 8, CREAM),
    [6, -5, CREAM], [7, -5, CREAM], [8, -5, SAND], [9, -5, SAND],
    ...run(-4, 6, 9, CREAM),
    ...run(-3, 4, 11, CREAM),
    ...run(-2, 3, 12, CREAM),
    ...run(-1, 2, 13, CREAM),
    ...run(0, 1, 14, SAND),
    ...run(1, 1, 14, CREAM),
    [3, 1, GRAY], [6, 1, GRAY], [9, 1, GRAY], [12, 1, GRAY],
    ...run(2, 2, 13, SAND),
  ],
  cap: [
    ...run(-3, 5, 10, CREAM), ...run(-2, 3, 12, CREAM), ...run(-1, 2, 13, CREAM),
    ...run(0, 1, 14, CREAM), ...run(1, 9, 18, SAND), [7, -4, CLAY], [8, -4, CLAY],
  ],
  headphones: [
    [7, -2, INK], [8, -2, INK],
    [5, -1, INK], [10, -1, INK],
    [3, 0, INK], [12, 0, INK],
    [1, 1, INK], [14, 1, INK],
    [0, 2, INK], [15, 2, INK],
    [-1, 3, INK], [16, 3, INK],
    [-1, 4, INK], [16, 4, INK],
    [-1, 5, INK], [16, 5, INK],
    ...run(6, -2, -1, INK),
    ...run(7, -3, -1, INK),
    ...run(8, -3, -1, INK),
    ...run(9, -3, -1, INK),
    ...run(10, -2, -1, INK),
    [-2, 7, GRAY], [-2, 8, SAND], [-2, 9, GRAY],
    ...run(6, 16, 17, INK),
    ...run(7, 16, 18, INK),
    ...run(8, 16, 18, INK),
    ...run(9, 16, 18, INK),
    ...run(10, 16, 17, INK),
    [17, 7, GRAY], [17, 8, SAND], [17, 9, GRAY],
  ],
  flower: [
    [13, -4, CREAM], [12, -3, CREAM], [14, -3, CREAM], [13, -2, CREAM],
    [12, -4, CREAM], [14, -4, CREAM], [12, -2, CREAM], [14, -2, CREAM], [13, -3, CLAY],
  ],
  crown: [
    [4, -4, CREAM], [7, -4, CREAM], [8, -4, CREAM], [11, -4, CREAM],
    ...run(-3, 4, 11, CREAM), ...run(-2, 4, 11, CREAM), ...run(-1, 4, 11, CREAM), [7, -2, CLAY], [8, -2, CLAY],
  ],
  party: [
    [7, -6, CLAY], [8, -6, CLAY], ...run(-5, 7, 8, CREAM), ...run(-4, 6, 9, CLAY),
    ...run(-3, 6, 9, CREAM), ...run(-2, 5, 10, CLAY), ...run(-1, 5, 10, CREAM),
  ],
  bow: [
    [10, -2, CREAM], [11, -2, CREAM], [14, -2, CREAM], [15, -2, CREAM],
    [10, -1, CREAM], [11, -1, CREAM], [12, -1, CLAY], [13, -1, CLAY], [14, -1, CREAM], [15, -1, CREAM],
    [10, 0, CREAM], [11, 0, CREAM], [14, 0, CREAM], [15, 0, CREAM],
  ],
  cat: [
    [2, -3, CLAY], [13, -3, CLAY], ...run(-2, 2, 3, CLAY), ...run(-2, 12, 13, CLAY),
    ...run(-1, 2, 4, CLAY), ...run(-1, 11, 13, CLAY), ...run(0, 3, 4, CLAY), ...run(0, 11, 12, CLAY),
    [3, -1, BLUSH], [12, -1, BLUSH],
  ],
  bunny: [
    ...[-6, -5, -4, -3, -2, -1].flatMap((y) => [...run(y, 3, 5, CREAM), ...run(y, 10, 12, CREAM)]),
    ...[-5, -4, -3, -2].flatMap((y) => [[4, y, BLUSH], [11, y, BLUSH]] as Px[]),
  ],
  chef: [
    ...run(-6, 5, 10, CREAM), ...run(-5, 4, 11, CREAM), ...run(-4, 4, 11, CREAM), ...run(-3, 4, 11, CREAM),
    ...run(-2, 5, 10, CREAM), ...run(-1, 4, 11, SAND),
  ],
  wizard: [
    ...run(-6, 9, 10, INK), ...run(-5, 8, 10, INK), ...run(-4, 7, 10, INK), ...run(-3, 6, 10, INK),
    ...run(-2, 5, 11, INK), ...run(-1, 4, 11, INK), ...run(0, 0, 15, INK), [8, -3, CREAM], [10, -2, CLAY],
  ],
  halo: [...run(-6, 5, 10, CREAM), ...run(-5, 4, 11, CREAM)],
  bandana: [
    ...run(-1, 5, 10, INK), ...run(0, 4, 11, INK), ...run(1, 2, 13, INK), ...run(2, 1, 14, INK),
    [15, 2, INK], [16, 1, INK], [16, 3, INK], [6, 0, CREAM], [10, 1, CREAM], [4, 2, CREAM], [12, 2, CREAM],
  ],
  viking: [
    ...run(-3, 5, 10, GRAY), ...run(-2, 3, 12, GRAY), ...run(-1, 2, 13, GRAY), ...run(0, 1, 14, SAND),
    [0, -1, CREAM], [-1, -2, CREAM], [-1, -3, CREAM], [-1, -4, CREAM],
    [15, -1, CREAM], [16, -2, CREAM], [16, -3, CREAM], [16, -4, CREAM],
  ],
  einstein: [
    ...run(-1, 0, 3, HAIR),
    [1, -1, HAIR_DARK],
    ...run(0, -1, 2, HAIR),
    ...run(1, -1, 1, HAIR),
    ...run(2, 0, 1, HAIR),
    ...run(3, 0, 1, HAIR),
    [0, 4, HAIR_DARK],
    ...run(-1, 12, 15, HAIR),
    [14, -1, HAIR_DARK],
    ...run(0, 13, 16, HAIR),
    ...run(1, 14, 16, HAIR),
    ...run(2, 14, 15, HAIR),
    ...run(3, 14, 15, HAIR),
    [15, 4, HAIR_DARK],
    ...run(8, 5, 10, HAIR),
    [3, 9, HAIR], [4, 9, HAIR_DARK],
    ...run(9, 5, 10, HAIR_DARK),
    [11, 9, HAIR_DARK], [12, 9, HAIR],
    ...run(10, 3, 5, HAIR),
    ...run(10, 10, 12, HAIR),
  ],
  tophat: [
    ...[-6, -5, -4, -3].flatMap((y) => run(y, 5, 10, INK)),
    ...run(-2, 5, 10, CLAY),
    ...run(-1, 5, 10, INK),
    ...run(0, 2, 13, INK),
    [6, -5, GRAY], [6, -4, GRAY],
  ],
  cowboy: [
    [5, -3, TAN], [6, -3, TAN], [9, -3, TAN], [10, -3, TAN],
    ...run(-2, 4, 11, TAN),
    ...run(-1, 4, 11, INK),
    ...run(0, -1, 16, TAN),
    [-1, -1, TAN], [16, -1, TAN],
    [-2, -2, TAN], [17, -2, TAN],
  ],
  graduation: [
    ...run(-4, 5, 10, INK),
    ...run(-3, 3, 12, INK),
    ...run(-2, 1, 14, INK),
    ...run(-1, 3, 12, INK),
    ...run(0, 4, 11, CAP_BASE),
    [7, -3, CREAM], [8, -3, CREAM],
    [14, -1, CREAM], [14, 0, CREAM], [14, 1, CREAM], [14, 2, CLAY],
  ],
  captain: [
    ...run(-3, 4, 11, CREAM),
    ...run(-2, 3, 12, CREAM),
    ...run(-1, 2, 13, CREAM),
    [7, -2, CLAY], [8, -2, CLAY], [7, -1, CLAY], [8, -1, CLAY],
    ...run(0, 1, 14, INK),
    ...run(1, 4, 11, INK),
  ],
  antennae: [
    [6, -1, CREAM], [5, -2, CREAM], [5, -3, CREAM], [4, -4, CREAM],
    ...run(-6, 3, 4, CLAY), ...run(-5, 3, 4, CLAY),
    [9, -1, CREAM], [10, -2, CREAM], [10, -3, CREAM], [11, -4, CREAM],
    ...run(-6, 11, 12, CLAY), ...run(-5, 11, 12, CLAY),
  ],
};

const FACES: Record<Face, Px[]> = {
  shades: [...run(5, 3, 12, INK), ...run(6, 3, 6, INK), ...run(6, 9, 12, INK), [4, 5, "#555555"], [10, 5, "#555555"]],
  glasses: [
    ...run(4, 3, 5, INK), ...run(8, 3, 5, INK), [2, 5, INK], [2, 6, INK], [2, 7, INK], [6, 5, INK], [6, 6, INK], [6, 7, INK],
    ...run(4, 10, 12, INK), ...run(8, 10, 12, INK), [9, 5, INK], [9, 6, INK], [9, 7, INK], [13, 5, INK], [13, 6, INK], [13, 7, INK],
    [7, 5, INK], [8, 5, INK],
  ],
  mustache: [...run(8, 5, 10, INK), [4, 9, INK], [5, 9, INK], [10, 9, INK], [11, 9, INK]],
  bandaid: [...run(3, 10, 13, CREAM), [11, 3, SAND], [12, 3, SAND]],
  scarf: [
    ...run(10, 0, 15, INK), ...run(11, 1, 14, INK), [3, 10, CREAM], [3, 11, CREAM], [7, 10, CREAM], [7, 11, CREAM],
    [11, 10, CREAM], [11, 11, CREAM], ...run(12, 11, 12, INK), ...run(13, 11, 12, INK), [11, 13, CREAM],
  ],
  bowtie: [
    [4, 11, INK], [5, 11, INK], [10, 11, INK], [11, 11, INK], ...run(12, 4, 6, INK), [7, 12, CREAM], [8, 12, CREAM],
    ...run(12, 9, 11, INK), [4, 13, INK], [5, 13, INK], [10, 13, INK], [11, 13, INK],
  ],
  freckles: [
    [2, 6, FRECKLE], [3, 7, FRECKLE], [5, 7, FRECKLE],
    [13, 6, FRECKLE], [12, 7, FRECKLE], [10, 7, FRECKLE],
  ],
  eyepatch: [
    ...run(5, 3, 5, INK), ...run(6, 3, 5, INK), ...run(7, 3, 5, INK),
    [2, 5, INK], [3, 4, INK], [4, 4, INK],
    [5, 3, INK], [6, 3, INK], [7, 3, INK],
    [8, 2, INK], [9, 2, INK], [10, 2, INK],
    [11, 1, INK], [12, 1, INK], [13, 1, INK],
  ],
  monocle: [
    ...run(4, 10, 12, INK), ...run(8, 10, 12, INK),
    [9, 5, INK], [9, 6, INK], [9, 7, INK], [13, 5, INK], [13, 6, INK], [13, 7, INK],
    [14, 8, GRAY], [14, 9, GRAY], [14, 10, GRAY], [13, 11, GRAY],
  ],
  star: [
    [12, 7, CREAM],
    [11, 8, CREAM], [12, 8, CREAM], [13, 8, CREAM],
    ...run(9, 10, 14, CREAM),
    [11, 10, CREAM], [12, 10, CREAM], [13, 10, CREAM],
    [11, 11, CREAM], [13, 11, CREAM],
  ],
};

const EYES: Record<Mood, Px[]> = {
  happy: [[4, 6, INK], [11, 6, INK]],
  wave: [],
  tired: [[4, 7, INK], [11, 7, INK]],
  sleeping: [...run(7, 3, 4, INK), ...run(7, 11, 12, INK)],
  proud: [[4, 5, INK], [11, 5, INK]],
  sad: [[4, 7, INK], [11, 7, INK]],
};
EYES.wave = EYES.happy;

const MOUTHS: Record<Mood, Px[]> = {
  happy: [[6, 8, INK], [9, 8, INK], [7, 9, INK], [8, 9, INK]],
  wave: [],
  tired: run(9, 6, 9, INK),
  sleeping: [[7, 9, INK], [8, 9, INK]],
  proud: [...run(8, 6, 9, INK), ...run(9, 7, 8, INK)],
  sad: [[7, 9, INK], [8, 9, INK], [6, 10, INK], [9, 10, INK]],
};
MOUTHS.wave = MOUTHS.happy;

const BLUSH_PX: Px[] = [...run(8, 2, 3, BLUSH), ...run(8, 12, 13, BLUSH)];
const Z: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1], [1, 2], [0, 3], [1, 3], [2, 3], [3, 3]];

/** Pixels around a shape that get the dark outline. */
function outline(pixels: Px[]): Px[] {
  const filled = new Set(pixels.map(([x, y]) => `${x},${y}`));
  const edge = new Set<string>();
  for (const [x, y] of pixels) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!filled.has(k)) edge.add(k);
    }
  }
  return [...edge].map((k) => {
    const [x, y] = k.split(",").map(Number);
    return [x, y, INK] as Px;
  });
}

function Pixels({ px }: { px: Px[] }) {
  return (
    <>
      {px.map(([x, y, c]) => (
        <rect key={`${x},${y}`} x={x} y={y} width={1.02} height={1.02} fill={c} />
      ))}
    </>
  );
}

const steps = (n: number) => (t: number) => Math.round(t * n) / n;

/** Rilo: a small pixel mochi who lives in your phone. */
export default function Mascot({
  mood = "happy",
  outfit = null,
  face = null,
  size = 160,
  onDark = false,
  still = false,
}: Props) {
  const base = useMemo(() => {
    const layer = [...BODY, ...(outfit ? OUTFITS[outfit] : []), ...(face ? FACES[face] : [])];
    const dedup = new Map<string, Px>();
    for (const p of layer) dedup.set(`${p[0]},${p[1]}`, p);
    const pixels = [...dedup.values()];
    return [...outline(pixels), ...pixels];
  }, [outfit, face]);

  const eyes =
    face === "shades"
      ? []
      : face === "eyepatch"
        ? EYES[mood].filter(([x]) => x > 7)
        : EYES[mood];
  const mouth =
    outfit === "einstein" ? [] : face === "mustache" ? MOUTHS[mood].filter(([, y]) => y > 8) : MOUTHS[mood];

  const idle =
    mood === "sleeping"
      ? { y: [0, 0.5, 0], transition: { duration: 2.4, repeat: Infinity, ease: steps(2) } }
      : mood === "proud"
        ? { y: [0, -2, 0], transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.5, ease: steps(3) } }
        : mood === "wave"
          ? { y: [0, -2, 0, -2, 0], transition: { duration: 0.9, repeat: Infinity, repeatDelay: 1.4, ease: steps(4) } }
          : mood === "sad" || mood === "tired"
          ? undefined
          : { y: [0, -1, 0], transition: { duration: 1.6, repeat: Infinity, ease: steps(2) } };

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="-4 -7 26 26"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Rilo, ${mood}`}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ overflow: "visible" }}
    >
      <rect x={1} y={15} width={14} height={1} fill={onDark ? "#000" : INK} opacity={onDark ? 0.35 : 0.08} />

      <motion.g animate={still ? undefined : idle}>
        <Pixels px={base} />
        <Pixels
          px={
            face === "glasses"
              ? BLUSH_PX.filter(([x]) => x === 2 || x === 13)
              : face === "star" || face === "monocle"
                ? BLUSH_PX.filter(([x]) => x < 8)
                : BLUSH_PX
          }
        />

        {mood === "happy" || mood === "wave" ? (
          <motion.g
            style={{ originY: "6px" }}
            animate={still ? undefined : { scaleY: [1, 1, 0.5, 1, 1] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.92, 0.94, 0.96, 1], ease: steps(1) }}
          >
            <Pixels px={eyes} />
          </motion.g>
        ) : (
          <Pixels px={eyes} />
        )}
        <Pixels px={mouth} />
      </motion.g>

      {mood === "sleeping" &&
        [0, 1].map((i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0], x: [0, 1, 2, 3], y: [0, -2, -4, -6] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 1.2, ease: steps(4) }}
          >
            <Pixels px={Z.map(([x, y]) => [15 + x + i * 3, -4 + y - i * 4, onDark ? CREAM : INK] as Px)} />
          </motion.g>
        ))}

      {mood === "proud" &&
        [
          [-3, 0],
          [17, -2],
        ].map(([x, y], i) => (
          <motion.g
            key={i}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.6, ease: steps(2) }}
          >
            <Pixels px={[[x, y - 1, CLAY], [x - 1, y, CLAY], [x, y, CLAY], [x + 1, y, CLAY], [x, y + 1, CLAY]]} />
          </motion.g>
        ))}
    </motion.svg>
  );
}
