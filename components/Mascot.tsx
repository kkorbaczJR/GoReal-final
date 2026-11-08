"use client";

import { motion } from "framer-motion";
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

/** Rilo: a small clay-colored mochi who lives in your phone. */
export default function Mascot({ mood = "happy", outfit = null, size = 160, onDark = false, still = false }: Props) {
  const idle =
    mood === "sleeping"
      ? { scaleY: [1, 1.04, 1], scaleX: [1, 0.98, 1], transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" as const } }
      : mood === "sad" || mood === "tired"
        ? { scaleY: [1, 0.98, 1], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const } }
        : mood === "proud"
          ? { y: [0, -10, 0], transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.6, ease: "easeOut" as const } }
          : { y: [0, -4, 0], transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Rilo, ${mood}`}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      style={{ overflow: "visible" }}
    >
      <ellipse cx="100" cy="176" rx="48" ry="6" fill={onDark ? "#000" : INK} opacity={onDark ? 0.3 : 0.06} />

      <motion.g style={{ originX: "100px", originY: "172px" }} animate={still ? undefined : idle}>
        {mood === "wave" && (
          <motion.ellipse
            cx="168"
            cy="124"
            rx="11"
            ry="15"
            fill={CLAY}
            style={{ originX: "158px", originY: "138px" }}
            animate={{ rotate: [0, -30, 0, -30, 0] }}
            transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 1 }}
          />
        )}

        <path
          d="M100 50 C148 50 172 88 172 126 C172 158 144 172 100 172 C56 172 28 158 28 126 C28 88 52 50 100 50 Z"
          fill={CLAY}
        />

        <Face mood={mood} hidden={outfit === "shades"} />

        <ellipse cx="62" cy="134" rx="10" ry="6" fill={BLUSH} opacity={mood === "sad" || mood === "tired" ? 0.5 : 1} />
        <ellipse cx="138" cy="134" rx="10" ry="6" fill={BLUSH} opacity={mood === "sad" || mood === "tired" ? 0.5 : 1} />

        {outfit && <OutfitLayer outfit={outfit} />}
      </motion.g>

      {mood === "sleeping" && <Zzz color={onDark ? CREAM : INK} />}
    </motion.svg>
  );
}

function Face({ mood, hidden }: { mood: Mood; hidden: boolean }) {
  const line = { stroke: INK, strokeWidth: 5, strokeLinecap: "round" as const, fill: "none" };
  return (
    <g>
      {!hidden && (mood === "happy" || mood === "wave") && (
        <motion.g
          style={{ originY: "118px" }}
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.9, 0.94, 0.98, 1] }}
        >
          <circle cx="78" cy="118" r="6.5" fill={INK} />
          <circle cx="122" cy="118" r="6.5" fill={INK} />
        </motion.g>
      )}
      {!hidden && mood === "tired" && (
        <>
          <path d="M71 118 a7 7 0 0 0 14 0 Z" fill={INK} />
          <path d="M115 118 a7 7 0 0 0 14 0 Z" fill={INK} />
        </>
      )}
      {!hidden && mood === "sleeping" && (
        <>
          <path d="M70 118 q8 7 16 0" {...line} />
          <path d="M114 118 q8 7 16 0" {...line} />
        </>
      )}
      {!hidden && mood === "proud" && (
        <>
          <path d="M70 120 q8 -10 16 0" {...line} />
          <path d="M114 120 q8 -10 16 0" {...line} />
        </>
      )}
      {!hidden && mood === "sad" && (
        <>
          <circle cx="78" cy="122" r="6" fill={INK} />
          <circle cx="122" cy="122" r="6" fill={INK} />
        </>
      )}

      {(mood === "happy" || mood === "wave") && <path d="M94 131 q6 6 12 0" {...line} strokeWidth={4} />}
      {mood === "tired" && <path d="M94 134 h12" {...line} strokeWidth={4} />}
      {mood === "sleeping" && <ellipse cx="100" cy="134" rx="3.5" ry="4.5" fill={INK} />}
      {mood === "proud" && <path d="M92 129 q8 11 16 0 Z" fill={INK} />}
      {mood === "sad" && <path d="M94 137 q6 -5 12 0" {...line} strokeWidth={4} />}
    </g>
  );
}

function OutfitLayer({ outfit }: { outfit: Outfit }) {
  switch (outfit) {
    case "beanie":
      return (
        <g>
          <path d="M50 88 C52 60 74 46 100 46 C126 46 148 60 150 88 Z" fill={CREAM} />
          {[72, 86, 100, 114, 128].map((x) => (
            <path key={x} d={`M${x} 58 V84`} stroke="#e8e6dc" strokeWidth="3" strokeLinecap="round" />
          ))}
          <rect x="46" y="82" width="108" height="14" rx="7" fill="#e8e6dc" />
          <circle cx="100" cy="42" r="9" fill={CREAM} stroke="#e8e6dc" strokeWidth="3" />
        </g>
      );
    case "shades":
      return (
        <g>
          <rect x="62" y="106" width="34" height="22" rx="9" fill={INK} />
          <rect x="104" y="106" width="34" height="22" rx="9" fill={INK} />
          <rect x="94" y="111" width="12" height="4" rx="2" fill={INK} />
          <path d="M69 112 h8" stroke={CREAM} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        </g>
      );
    case "headphones":
      return (
        <g>
          <path d="M36 118 C36 70 62 46 100 46 C138 46 164 70 164 118" stroke={INK} strokeWidth="8" fill="none" strokeLinecap="round" />
          <rect x="22" y="104" width="22" height="36" rx="11" fill={INK} />
          <rect x="156" y="104" width="22" height="36" rx="11" fill={INK} />
        </g>
      );
    case "flower":
      return (
        <g transform="translate(136 62)">
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="0" cy="-10" rx="6.5" ry="9" fill={CREAM} stroke={INK} strokeWidth="2.5" transform={`rotate(${r})`} />
          ))}
          <circle r="5.5" fill={INK} />
        </g>
      );
    case "cap":
      return (
        <g>
          <path d="M54 84 C56 58 76 46 100 46 C124 46 144 58 146 84 Z" fill={CREAM} />
          <path d="M100 84 C126 80 160 80 176 88 C162 96 128 94 100 90 Z" fill="#e8e6dc" />
          <circle cx="100" cy="48" r="4" fill={CLAY} />
        </g>
      );
    case "crown":
      return (
        <g>
          <path
            d="M68 66 L70 36 L86 52 L100 28 L114 52 L130 36 L132 66 Z"
            fill={CREAM}
            stroke={INK}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="100" cy="54" r="4" fill={CLAY} stroke={INK} strokeWidth="2" />
        </g>
      );
  }
}

function Zzz({ color }: { color: string }) {
  return (
    <g fontFamily="var(--font-serif)" fontStyle="italic" fill={color}>
      {[0, 1, 2].map((i) => (
        <motion.text
          key={i}
          x={148 + i * 12}
          y={60 - i * 14}
          fontSize={14 + i * 5}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: [0, 0.9, 0], y: [8, -6, -16] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.9 }}
        >
          z
        </motion.text>
      ))}
    </g>
  );
}
