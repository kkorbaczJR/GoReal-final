"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import type { Outfit } from "@/lib/shop";

export type Mood = "happy" | "wave" | "tired" | "sleeping" | "proud" | "sad";

type Props = {
  mood?: Mood;
  outfit?: Outfit | null;
  size?: number;
  /** Rilo on a dark background (break mode): the floating z's turn light. */
  onDark?: boolean;
  /** Turn off idle motion (for small thumbnails). */
  still?: boolean;
};

const CLAY = "#d97757";
const INK = "#1f1e1d";
const BLUSH = "#f0a58a";
const CREAM = "#faf9f5";
const SAND = "#e8e6dc";

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
    ...run(-5, 7, 8, CREAM),
    ...run(-4, 5, 10, CREAM), ...run(-3, 3, 12, CREAM), ...run(-2, 2, 13, CREAM), ...run(-1, 1, 14, CREAM),
    ...run(0, 0, 15, SAND), ...run(1, 0, 15, SAND),
  ],
  cap: [
    ...run(-3, 5, 10, CREAM), ...run(-2, 3, 12, CREAM), ...run(-1, 2, 13, CREAM),
    ...run(0, 1, 14, CREAM), ...run(1, 9, 18, SAND), [7, -4, CLAY], [8, -4, CLAY],
  ],
  shades: [...run(5, 3, 12, INK), ...run(6, 3, 6, INK), ...run(6, 9, 12, INK), [4, 5, "#6b6a65"]],
  headphones: [
    ...run(-3, 4, 11, INK), [2, -2, INK], [3, -2, INK], [12, -2, INK], [13, -2, INK],
    [1, -1, INK], [14, -1, INK], [0, 0, INK], [15, 0, INK],
    ...[3, 4, 5, 6, 7].flatMap((y) => [[-2, y, INK], [-1, y, INK], [16, y, INK], [17, y, INK]] as Px[]),
  ],
  flower: [
    [13, -4, CREAM], [12, -3, CREAM], [14, -3, CREAM], [13, -2, CREAM],
    [12, -4, CREAM], [14, -4, CREAM], [12, -2, CREAM], [14, -2, CREAM], [13, -3, CLAY],
  ],
  crown: [
    [4, -4, CREAM], [7, -4, CREAM], [8, -4, CREAM], [11, -4, CREAM],
    ...run(-3, 4, 11, CREAM), ...run(-2, 4, 11, CREAM), ...run(-1, 4, 11, CREAM), [7, -2, CLAY], [8, -2, CLAY],
  ],
};

const EYES: Record<Mood, Px[]> = {
  happy: [...run(5, 4, 5, INK), ...run(6, 4, 5, INK), ...run(5, 10, 11, INK), ...run(6, 10, 11, INK)],
  wave: [],
  tired: [...run(6, 4, 5, INK), ...run(6, 10, 11, INK)],
  sleeping: [[3, 5, INK], [4, 6, INK], [5, 6, INK], [6, 5, INK], [9, 5, INK], [10, 6, INK], [11, 6, INK], [12, 5, INK]],
  proud: [[3, 6, INK], [4, 5, INK], [5, 5, INK], [6, 6, INK], [9, 6, INK], [10, 5, INK], [11, 5, INK], [12, 6, INK]],
  sad: [...run(6, 4, 5, INK), ...run(7, 4, 5, INK), ...run(6, 10, 11, INK), ...run(7, 10, 11, INK)],
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
const ARM: Px[] = [...run(2, 18, 19, CLAY), ...run(3, 18, 19, CLAY), ...run(4, 18, 19, CLAY)];
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
export default function Mascot({ mood = "happy", outfit = null, size = 160, onDark = false, still = false }: Props) {
  const base = useMemo(() => {
    const layer = outfit ? [...BODY, ...OUTFITS[outfit]] : BODY;
    const dedup = new Map<string, Px>();
    for (const p of layer) dedup.set(`${p[0]},${p[1]}`, p);
    const pixels = [...dedup.values()];
    return [...outline(pixels), ...pixels];
  }, [outfit]);

  const armPx = useMemo(() => [...outline(ARM), ...ARM], []);
  const eyes = outfit === "shades" ? [] : EYES[mood];

  const idle =
    mood === "sleeping"
      ? { y: [0, 0.5, 0], transition: { duration: 2.4, repeat: Infinity, ease: steps(2) } }
      : mood === "proud"
        ? { y: [0, -2, 0], transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.5, ease: steps(3) } }
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
        {mood === "wave" && (
          <motion.g
            style={{ originX: "18px", originY: "5px" }}
            animate={{ rotate: [0, -20, 0, -20, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1, ease: steps(4) }}
          >
            <Pixels px={armPx} />
          </motion.g>
        )}

        <Pixels px={base} />
        <Pixels px={BLUSH_PX} />

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
        <Pixels px={MOUTHS[mood]} />
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
