"use client";

import { motion } from "framer-motion";
import type { Outfit } from "@/lib/shop";

export type Mood = "happy" | "sleeping" | "proud" | "sad" | "wave";

type Props = {
  mood?: Mood;
  outfit?: Outfit | null;
  size?: number;
  /** White Rilo for dark backgrounds (used in locked break mode). */
  inverted?: boolean;
  /** Turn off the idle bobbing (for small thumbnails). */
  still?: boolean;
};

const ACCENT = "#ff8a1f";

/** Rilo: a round, sleepy little blob who lives in GoReal. */
export default function Mascot({ mood = "happy", outfit = null, size = 160, inverted = false, still = false }: Props) {
  const body = inverted ? "#ffffff" : "#0b0b0c";
  const face = inverted ? "#0b0b0c" : "#ffffff";

  const bob =
    mood === "sleeping"
      ? { scaleY: [1, 1.035, 1], scaleX: [1, 0.985, 1], transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const } }
      : mood === "sad"
        ? { y: [0, 2, 0], transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" as const } }
        : { y: [0, -6, 0], transition: { duration: mood === "proud" ? 0.9 : 2.2, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Rilo the mascot, ${mood}`}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      style={{ overflow: "visible" }}
    >
      <ellipse cx="100" cy="186" rx="52" ry="7" fill="#000" opacity={inverted ? 0.35 : 0.08} />

      <motion.g style={{ originX: "100px", originY: "180px" }} animate={still ? undefined : bob}>
        {/* feet */}
        <ellipse cx="74" cy="176" rx="15" ry="9" fill={body} />
        <ellipse cx="126" cy="176" rx="15" ry="9" fill={body} />

        {/* arm that waves */}
        {mood === "wave" && (
          <motion.g
            style={{ originX: "158px", originY: "122px" }}
            animate={{ rotate: [0, -28, 0, -28, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }}
          >
            <ellipse cx="170" cy="104" rx="12" ry="18" transform="rotate(30 170 104)" fill={body} />
          </motion.g>
        )}

        {/* body */}
        <path
          d="M100 50 C150 50 172 88 172 124 C172 160 142 178 100 178 C58 178 28 160 28 124 C28 88 50 50 100 50 Z"
          fill={body}
        />
        {/* little tuft */}
        {outfit === null && (
          <path d="M96 52 C92 40 98 32 106 30 C102 38 104 44 108 51" fill={body} />
        )}

        <Face mood={mood} face={face} hidden={outfit === "shades"} />

        {/* cheeks */}
        <ellipse cx="56" cy="132" rx="9" ry="6" fill={ACCENT} opacity={mood === "sad" ? 0.45 : 0.95} />
        <ellipse cx="144" cy="132" rx="9" ry="6" fill={ACCENT} opacity={mood === "sad" ? 0.45 : 0.95} />

        {outfit && <OutfitLayer outfit={outfit} face={face} />}
      </motion.g>

      {mood === "sleeping" && <Zzz color={inverted ? "#ffffff" : "#0b0b0c"} />}
      {mood === "proud" && <Sparkles />}
    </motion.svg>
  );
}

function Face({ mood, face, hidden }: { mood: Mood; face: string; hidden: boolean }) {
  const stroke = { stroke: face, strokeWidth: 6, strokeLinecap: "round" as const, fill: "none" };
  return (
    <g>
      {!hidden && mood === "sleeping" && (
        <>
          <path d="M62 112 q12 10 24 0" {...stroke} />
          <path d="M114 112 q12 10 24 0" {...stroke} />
        </>
      )}
      {!hidden && mood === "proud" && (
        <>
          <path d="M62 116 q12 -14 24 0" {...stroke} />
          <path d="M114 116 q12 -14 24 0" {...stroke} />
        </>
      )}
      {!hidden && (mood === "happy" || mood === "wave") && (
        <motion.g
          style={{ originY: "110px" }}
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.9, 0.94, 0.98, 1] }}
        >
          <ellipse cx="74" cy="110" rx="7" ry="10" fill={face} />
          <ellipse cx="126" cy="110" rx="7" ry="10" fill={face} />
        </motion.g>
      )}
      {!hidden && mood === "sad" && (
        <>
          <ellipse cx="74" cy="114" rx="6" ry="8" fill={face} />
          <ellipse cx="126" cy="114" rx="6" ry="8" fill={face} />
          <path d="M62 98 l20 -6" {...stroke} strokeWidth={5} />
          <path d="M138 98 l-20 -6" {...stroke} strokeWidth={5} />
          <motion.path
            d="M136 126 q4 8 0 12 q-4 -4 0 -12 Z"
            fill="#8fc7ff"
            animate={{ y: [0, 10], opacity: [1, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8 }}
          />
        </>
      )}

      {/* mouth */}
      {mood === "sleeping" && <ellipse cx="100" cy="138" rx="5" ry="6" fill={face} />}
      {(mood === "happy" || mood === "wave") && <path d="M90 134 q10 10 20 0" {...stroke} strokeWidth={5} />}
      {mood === "proud" && <path d="M86 132 q14 18 28 0 Z" fill={face} />}
      {mood === "sad" && <path d="M90 142 q10 -9 20 0" {...stroke} strokeWidth={5} />}
    </g>
  );
}

function OutfitLayer({ outfit, face }: { outfit: Outfit; face: string }) {
  switch (outfit) {
    case "beanie":
      return (
        <g>
          <path d="M42 86 C46 48 76 34 100 34 C124 34 154 48 158 86 Z" fill={ACCENT} />
          <rect x="38" y="80" width="124" height="16" rx="8" fill="#e86f00" />
          <circle cx="100" cy="30" r="10" fill="#e86f00" />
        </g>
      );
    case "shades":
      return (
        <g>
          <rect x="54" y="98" width="40" height="24" rx="10" fill={face} />
          <rect x="106" y="98" width="40" height="24" rx="10" fill={face} />
          <rect x="58" y="102" width="32" height="16" rx="7" fill={ACCENT} />
          <rect x="110" y="102" width="32" height="16" rx="7" fill={ACCENT} />
          <rect x="92" y="105" width="16" height="5" rx="2.5" fill={face} />
          <path d="M64 106 l8 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        </g>
      );
    case "headphones":
      return (
        <g>
          <path d="M34 112 C34 60 62 38 100 38 C138 38 166 60 166 112" stroke={ACCENT} strokeWidth="9" fill="none" strokeLinecap="round" />
          <rect x="20" y="98" width="22" height="38" rx="11" fill={ACCENT} />
          <rect x="158" y="98" width="22" height="38" rx="11" fill={ACCENT} />
        </g>
      );
    case "flower":
      return (
        <g transform="translate(140 58)">
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="0" cy="-11" rx="7" ry="10" fill={face === "#ffffff" ? "#ffffff" : "#0b0b0c"} stroke={ACCENT} strokeWidth="3" transform={`rotate(${r})`} />
          ))}
          <circle r="7" fill={ACCENT} />
        </g>
      );
    case "cap":
      return (
        <g>
          <path d="M48 80 C50 50 74 38 100 38 C126 38 150 50 152 80 Z" fill={ACCENT} />
          <path d="M100 74 C130 72 168 74 182 84 C170 90 130 88 100 84 Z" fill="#e86f00" />
          <circle cx="100" cy="40" r="5" fill="#e86f00" />
          <path d="M48 80 L152 80" stroke="#e86f00" strokeWidth="4" />
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M62 64 L66 30 L84 48 L100 22 L116 48 L134 30 L138 64 Z" fill="#ffc21f" stroke="#e8a000" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="100" cy="50" r="5" fill={ACCENT} />
        </g>
      );
  }
}

function Zzz({ color }: { color: string }) {
  return (
    <g fontFamily="var(--font-display)" fontWeight="600" fill={color}>
      {[0, 1, 2].map((i) => (
        <motion.text
          key={i}
          x={150 + i * 12}
          y={56 - i * 14}
          fontSize={14 + i * 5}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: [0, 1, 0], y: [8, -6, -16] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}
        >
          z
        </motion.text>
      ))}
    </g>
  );
}

function Sparkles() {
  const spots = [
    { x: 22, y: 50, s: 1 },
    { x: 176, y: 40, s: 1.3 },
    { x: 182, y: 118, s: 0.8 },
  ];
  return (
    <g fill={ACCENT}>
      {spots.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
          <motion.path
            d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z"
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.45 }}
          />
        </g>
      ))}
    </g>
  );
}
