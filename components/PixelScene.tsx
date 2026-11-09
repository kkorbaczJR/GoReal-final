import type { Background } from "@/lib/shop";

type Px = [x: number, y: number, color: string];

const W = 40;
const H = 24;
const ORANGE = "var(--accent)";
const WHITE = "#ffffff";
const INK = "#111111";

function rect(x0: number, y0: number, w: number, h: number, c: string): Px[] {
  const out: Px[] = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) out.push([x, y, c]);
  return out;
}

function disc(cx: number, cy: number, r: number, c: string): Px[] {
  const out: Px[] = [];
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) out.push([cx + x, cy + y, c]);
  return out;
}

function cloud(x: number, y: number): Px[] {
  return [...rect(x + 2, y, 4, 1, WHITE), ...rect(x + 1, y + 1, 7, 1, WHITE), ...rect(x, y + 2, 10, 2, WHITE)];
}

/** A few scattered pixels, the same every render. */
function sprinkle(count: number, seed: number, c: string): Px[] {
  const out: Px[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280;
    const x = Math.floor((s / 233280) * W);
    s = (s * 9301 + 49297) % 233280;
    const y = Math.floor((s / 233280) * (H - 6));
    out.push([x, y, c]);
  }
  return out;
}

function hill(baseY: number, peaks: [number, number][], c: string): Px[] {
  const out: Px[] = [];
  for (let x = 0; x < W; x++) {
    const top = Math.min(...peaks.map(([px, py]) => py + Math.floor(Math.abs(x - px) / 2)));
    for (let y = Math.min(top, baseY); y < H; y++) out.push([x, y, c]);
  }
  return out;
}

function pine(cx: number, baseY: number, height: number, c: string): Px[] {
  const out: Px[] = [...rect(cx, baseY, 1, 2, INK)];
  for (let i = 0; i < height; i++) {
    const half = Math.floor((i + 1) / 2);
    out.push(...rect(cx - half, baseY - height + i, 2 * half + 1, 1, c));
  }
  return out;
}

function building(x: number, top: number, w: number, c: string, windows: string): Px[] {
  const out: Px[] = rect(x, top, w, H - top, c);
  for (let wy = top + 2; wy < H - 3; wy += 3) for (let wx = x + 1; wx < x + w - 1; wx += 2) if ((wx + wy) % 4 !== 1) out.push([wx, wy, windows]);
  return out;
}

const SCENES: Record<Background, { base: string; px: Px[] }> = {
  grid: {
    base: WHITE,
    px: Array.from({ length: (W / 4) * (H / 4) }, (_, i) => [(i % (W / 4)) * 4 + 1, Math.floor(i / (W / 4)) * 4 + 1, "#d4d4d4"] as Px),
  },
  checker: {
    base: WHITE,
    px: Array.from({ length: (W / 4) * (H / 4) }, (_, i) => {
      const cx = i % (W / 4);
      const cy = Math.floor(i / (W / 4));
      return (cx + cy) % 2 === 0 ? rect(cx * 4, cy * 4, 4, 4, "#ffe2d3") : [];
    }).flat(),
  },
  sunny: {
    base: "#fff0e8",
    px: [...disc(32, 5, 3, ORANGE), ...cloud(4, 4), ...cloud(20, 9), ...rect(0, 21, W, 3, "#ffd2bd")],
  },
  hills: {
    base: WHITE,
    px: [
      ...disc(9, 6, 2, ORANGE),
      ...hill(18, [[8, 15], [30, 13]], "#ebebeb"),
      ...hill(20, [[20, 17], [40, 18]], "#d4d4d4"),
    ],
  },
  snow: {
    base: "#1e1e1e",
    px: [...sprinkle(40, 7, WHITE), ...rect(0, 20, W, 4, WHITE), ...rect(4, 19, 6, 1, WHITE), ...rect(27, 19, 8, 1, WHITE)],
  },
  sunset: {
    base: "#fff0e8",
    px: [
      ...rect(0, 8, W, 4, "#ffd2bd"),
      ...rect(0, 12, W, 4, "#ffb08a"),
      ...disc(20, 16, 5, WHITE),
      ...rect(0, 16, W, 8, ORANGE),
      ...rect(6, 18, 6, 1, "#ffb08a"),
      ...rect(24, 20, 9, 1, "#ffb08a"),
    ],
  },
  night: {
    base: INK,
    px: [...sprinkle(30, 3, WHITE), ...disc(31, 6, 3, WHITE), ...disc(33, 5, 2, INK)],
  },
  beach: {
    base: "#fff0e8",
    px: [
      ...disc(31, 5, 3, ORANGE),
      ...cloud(5, 3),
      ...rect(0, 12, W, 6, "#ebebeb"),
      ...rect(3, 14, 5, 1, WHITE),
      ...rect(16, 13, 6, 1, WHITE),
      ...rect(26, 15, 6, 1, WHITE),
      ...rect(0, 18, W, 6, "#ffd2bd"),
      ...rect(30, 20, 5, 1, "#ffb08a"),
      ...rect(8, 21, 4, 1, "#ffb08a"),
      ...rect(6, 9, 1, 10, INK),
      ...rect(2, 8, 4, 1, INK), ...rect(7, 8, 4, 1, INK),
      ...rect(3, 7, 3, 1, INK), ...rect(7, 7, 3, 1, INK),
      [1, 9, INK], [11, 9, INK],
    ],
  },
  forest: {
    base: "#fff0e8",
    px: [
      ...disc(33, 5, 2, ORANGE),
      ...rect(0, 21, W, 3, "#ebebeb"),
      ...pine(4, 20, 8, "#d4d4d4"),
      ...pine(12, 20, 11, INK),
      ...pine(20, 20, 7, "#d4d4d4"),
      ...pine(27, 20, 10, INK),
      ...pine(35, 20, 8, "#d4d4d4"),
    ],
  },
  city: {
    base: "#ffd2bd",
    px: [
      ...rect(0, 0, W, 6, "#fff0e8"),
      ...rect(0, 6, W, 5, "#ffe2d3"),
      ...disc(27, 11, 4, ORANGE),
      ...building(1, 12, 6, INK, "#ffb08a"),
      ...building(8, 8, 5, "#3a3a3a", ORANGE),
      ...building(14, 14, 6, INK, "#ffb08a"),
      ...building(21, 10, 4, "#3a3a3a", ORANGE),
      ...building(26, 15, 6, INK, "#ffb08a"),
      ...building(33, 9, 6, "#3a3a3a", ORANGE),
    ],
  },
  space: {
    base: INK,
    px: [
      ...sprinkle(34, 21, WHITE),
      ...sprinkle(10, 8, "#8d8d8d"),
      ...rect(23, 7, 15, 1, "#ffb08a"),
      ...disc(30, 8, 4, ORANGE),
      ...rect(25, 8, 11, 1, "#ffb08a"),
      ...rect(29, 6, 3, 1, "#ffb08a"),
      ...disc(8, 17, 2, "#d4d4d4"),
      [7, 16, WHITE],
    ],
  },
  pop: {
    base: ORANGE,
    px: [...sprinkle(16, 11, WHITE), ...sprinkle(10, 5, "#ffb08a")],
  },
};

/** A pixel background that fills its (rounded) container. */
export default function PixelScene({ scene, className }: { scene: Background; className?: string }) {
  const { base, px } = SCENES[scene];
  const seen = new Map<string, Px>();
  for (const p of px) if (p[0] >= 0 && p[0] < W && p[1] >= 0 && p[1] < H) seen.set(`${p[0]},${p[1]}`, p);
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <rect x={0} y={0} width={W} height={H} fill={base} />
      {[...seen.values()].map(([x, y, c]) => (
        <rect key={`${x},${y}`} x={x} y={y} width={1.02} height={1.02} fill={c} />
      ))}
    </svg>
  );
}
