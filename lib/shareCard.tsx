"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import Mascot from "@/components/Mascot";
import type { Aura, Back, Buddy, Face, Neck, Outfit } from "@/lib/shop";
import { APP_URL, streakLabel } from "@/lib/shareCopy";
import type { ShareDetails } from "@/lib/shareStreak";

export type ShareFormat = "story" | "square";

/** Everything Rilo is wearing right now. A null slot means he is not wearing that piece. */
export type ShareOutfit = {
  outfit: Outfit | null;
  face: Face | null;
  neck: Neck | null;
  back: Back | null;
  aura: Aura | null;
  buddy: Buddy | null;
};

type Spec = {
  w: number;
  h: number;
  margin: number;
  wellH: number;
  /** How tall Rilo is inside the peach well. Kept well under the well so the colour shows around him. */
  riloH: number;
  flame: number;
  number: number;
  label: number;
  padX: number;
  padY: number;
  dayLabel: number;
  dot: number;
  message: number;
  fact: number;
  factLabel: number;
  url: number;
  radius: number;
};

const STORY: Spec = {
  w: 1080,
  h: 1920,
  margin: 72,
  wellH: 500,
  riloH: 210,
  flame: 13,
  number: 180,
  label: 44,
  padX: 36,
  padY: 36,
  dayLabel: 28,
  dot: 86,
  message: 32,
  fact: 42,
  factLabel: 24,
  url: 26,
  radius: 48,
};

const SQUARE: Spec = {
  w: 1080,
  h: 1080,
  margin: 52,
  wellH: 240,
  riloH: 118,
  flame: 7,
  number: 96,
  label: 28,
  padX: 24,
  padY: 22,
  dayLabel: 20,
  dot: 52,
  message: 22,
  fact: 28,
  factLabel: 16,
  url: 20,
  radius: 36,
};

/** Same 12×12 check as the streak screen. `#` is the current colour. */
const CHECK = [
  "............",
  "............",
  ".........##.",
  "........##..",
  ".......##...",
  ".##...##....",
  "..##.##.....",
  "...###......",
  "....#.......",
  "............",
  "............",
  "............",
];

/** Same 12×12 snowflake as a frozen day on the streak screen. */
const SNOW = [
  ".....##.....",
  "..#..##..#..",
  "...#.##.#...",
  "....####....",
  ".....##.....",
  "############",
  "############",
  ".....##.....",
  "....####....",
  "...#.##.#...",
  "..#..##..#..",
  ".....##.....",
];

/** Same 12×12 flame as the streak screen. `o` is the accent, `w` is white. */
const FLAME = [
  "......o.....",
  ".....ooo....",
  ".....oooo...",
  "....ooooo...",
  "....oooooo..",
  "...ooooooo..",
  "...ooowoooo.",
  "..ooowwwooo.",
  "..ooowwwooo.",
  "..ooowwwooo.",
  "...ooowooo..",
  "....ooooo...",
];

/**
 * Rilo is an animated SVG that uses CSS variables for his colour, so redrawing every pixel by hand
 * would drift from the shop. We render the real component, bake the computed colours into the SVG,
 * and paint that image on the canvas. The SVG is built in memory from same-origin markup, never
 * fetched, so the canvas stays clean on GitHub Pages (base path and all).
 */
function captureRilo(outfit: ShareOutfit): string {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-2400px;top:0;width:720px;height:720px;pointer-events:none;";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(
        createElement(Mascot, {
          snapshot: true,
          still: true,
          mood: "happy",
          size: 640,
          outfit: outfit.outfit,
          face: outfit.face,
          neck: outfit.neck,
          back: outfit.back,
          aura: outfit.aura,
          buddy: outfit.buddy,
        }),
      );
    });
    const svg = host.querySelector("svg");
    if (!svg) throw new Error("Rilo did not draw");
    return bakeSvg(svg);
  } finally {
    root.unmount();
    host.remove();
  }
}

function bakeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const live = [svg, ...svg.querySelectorAll<SVGElement>("*")];
  const copied = [clone, ...clone.querySelectorAll<SVGElement>("*")];
  const shapes = new Set(["rect", "circle", "ellipse", "path", "polygon", "polyline", "line"]);
  live.forEach((el, i) => {
    const next = copied[i];
    if (!next) return;
    const style = getComputedStyle(el);
    if (shapes.has(el.tagName.toLowerCase())) {
      if (style.fill && style.fill !== "none") next.setAttribute("fill", style.fill);
      if (style.stroke && style.stroke !== "none") next.setAttribute("stroke", style.stroke);
    }
    if (style.opacity && style.opacity !== "1") next.setAttribute("opacity", style.opacity);
    if (style.transform && style.transform !== "none") {
      next.style.transform = style.transform;
      next.style.transformOrigin = style.transformOrigin;
      next.style.transformBox = style.transformBox;
    }
  });
  let box = { x: -7, y: -8, width: 31, height: 28 };
  try {
    const measured = svg.getBBox();
    if (measured.width > 0 && measured.height > 0) box = measured;
  } catch {
    // Keep the component's viewBox when the browser cannot measure it.
  }
  const pad = 1.5;
  const width = box.width + pad * 2;
  const height = box.height + pad * 2;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.style.opacity = "1";
  clone.style.transform = "none";
  clone.setAttribute("viewBox", `${box.x - pad} ${box.y - pad} ${width} ${height}`);
  clone.setAttribute("width", "800");
  clone.setAttribute("height", String(Math.round((800 * height) / width)));
  clone.style.overflow = "visible";
  return new XMLSerializer().serializeToString(clone);
}

function loadSvg(xml: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Rilo image failed (${xml.length}): ${xml.slice(0, 240)}`));
    };
    image.src = url;
  });
}

async function loadFonts(): Promise<{ serif: string; mono: string }> {
  const serifProbe = document.createElement("span");
  const monoProbe = document.createElement("span");
  serifProbe.style.fontFamily = "var(--font-serif)";
  monoProbe.style.fontFamily = "var(--font-text)";
  document.body.append(serifProbe, monoProbe);
  const serif = getComputedStyle(serifProbe).fontFamily;
  const mono = getComputedStyle(monoProbe).fontFamily;
  serifProbe.remove();
  monoProbe.remove();
  await Promise.all([
    document.fonts.load(`500 180px ${serif}`).catch(() => undefined),
    document.fonts.load(`500 42px ${serif}`).catch(() => undefined),
    document.fonts.load(`700 44px ${mono}`).catch(() => undefined),
    document.fonts.load(`600 28px ${mono}`).catch(() => undefined),
    document.fonts.load(`500 32px ${mono}`).catch(() => undefined),
    document.fonts.ready,
  ]);
  return { serif, mono };
}

function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    const next = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, pixel: number, color: string, dim: boolean) {
  FLAME.forEach((row, ry) => {
    [...row].forEach((cell, cx) => {
      if (cell === ".") return;
      ctx.fillStyle = dim ? (cell === "w" ? "#ffffff" : "#d4d4d4") : cell === "w" ? "#ffffff" : color;
      ctx.fillRect(x + cx * pixel, y + ry * pixel, pixel + 0.4, pixel + 0.4);
    });
  });
}

function drawMark(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, pixel: number, color: string) {
  ctx.fillStyle = color;
  rows.forEach((row, ry) => {
    [...row].forEach((cell, cx) => {
      if (cell !== "#") return;
      ctx.fillRect(x + cx * pixel, y + ry * pixel, pixel + 0.4, pixel + 0.4);
    });
  });
}

function fillRound(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}

function paint(
  ctx: CanvasRenderingContext2D,
  spec: Spec,
  rilo: HTMLImageElement,
  details: ShareDetails,
  serif: string,
  mono: string,
) {
  const ink = token("--ink", "#111111");
  const muted = token("--muted", "#6e6e6e");
  const faint = token("--faint", "#a8a8a8");
  const soft = token("--soft", "#f4f4f4");
  const line = token("--line", "#ebebeb");
  const card = token("--card", "#ffffff");
  const accent = token("--accent", "#fc4c02");
  const accentText = token("--accent-text", accent);
  const peach = token("--accent-soft", "#fff0e8");
  const onAccent = token("--on-accent", "#ffffff");
  const days = Math.max(0, Math.floor(details.count));
  const streakWord = days === 0 ? "day streak" : "day streak!";

  const inner = spec.w - spec.margin * 2;
  const textW = inner - spec.padX * 2;
  ctx.font = `500 ${spec.message}px ${mono}`;
  const messageLines = wrap(ctx, details.line, textW);
  const messageH = messageLines.length * spec.message * 1.45;
  const weekH = spec.dayLabel + Math.round(spec.dot * 0.22) + spec.dot;
  const factLabelLines = 2;
  const factsH = spec.fact + 10 + factLabelLines * (spec.factLabel + 4);
  const cardH = spec.padY + weekH + 22 + 1 + 20 + messageH + 20 + 1 + 20 + factsH + spec.padY;

  const flameH = 12 * spec.flame;
  const numberH = spec.number * 0.9;
  const gapAfterWell = Math.round(spec.wellH * 0.08);
  const stackH = spec.wellH + gapAfterWell + flameH + 10 + numberH + 8 + spec.label + 28 + cardH;
  const urlBand = spec.url + spec.margin;
  const top = Math.max(spec.margin * 0.6, (spec.h - urlBand - stackH) / 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, spec.w, spec.h);

  let y = top;
  ctx.fillStyle = peach;
  fillRound(ctx, spec.margin, y, inner, spec.wellH, spec.radius);

  const fit = Math.min(spec.riloH / rilo.naturalHeight, (inner * 0.46) / rilo.naturalWidth);
  const rw = rilo.naturalWidth * fit;
  const rh = rilo.naturalHeight * fit;
  const rx = spec.margin + (inner - rw) / 2;
  const ry = y + (spec.wellH - rh) / 2;
  ctx.fillStyle = "rgba(17, 17, 17, 0.08)";
  ctx.beginPath();
  ctx.ellipse(rx + rw / 2, ry + rh - rh * 0.02, rw * 0.22, Math.max(6, rh * 0.035), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(rilo, rx, ry, rw, rh);

  y += spec.wellH + gapAfterWell;
  const flameW = 12 * spec.flame;
  drawFlame(ctx, (spec.w - flameW) / 2, y, spec.flame, accent, days === 0);

  y += flameH + 10;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = ink;
  ctx.font = `500 ${spec.number}px ${serif}`;
  ctx.fillText(String(days), spec.w / 2, y);

  y += numberH + 8;
  ctx.fillStyle = days === 0 ? faint : accentText;
  ctx.font = `700 ${spec.label}px ${mono}`;
  ctx.fillText(streakWord, spec.w / 2, y);

  y += spec.label + 28;
  ctx.fillStyle = card;
  fillRound(ctx, spec.margin, y, inner, cardH, spec.radius);
  ctx.lineWidth = 2;
  ctx.strokeStyle = line;
  ctx.stroke();

  const weekTop = y + spec.padY;
  const slot = inner / details.week.length;
  details.week.forEach((day, i) => {
    const cx = spec.margin + slot * i + slot / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = day.today ? ink : faint;
    ctx.font = `600 ${spec.dayLabel}px ${mono}`;
    ctx.fillText(day.label, cx, weekTop);

    const dotTop = weekTop + spec.dayLabel + Math.round(spec.dot * 0.22);
    const radius = spec.dot / 2;
    ctx.beginPath();
    ctx.arc(cx, dotTop + radius, radius, 0, Math.PI * 2);
    if (day.mark === "done") {
      ctx.fillStyle = accent;
      ctx.fill();
    } else if (day.mark === "frozen") {
      ctx.fillStyle = card;
      ctx.fill();
      ctx.lineWidth = Math.max(2, spec.dot * 0.045);
      ctx.strokeStyle = ink;
      ctx.stroke();
    } else {
      ctx.fillStyle = soft;
      ctx.fill();
      if (day.today) {
        ctx.lineWidth = Math.max(3, spec.dot * 0.06);
        ctx.strokeStyle = ink;
        ctx.stroke();
      }
    }
    if (day.mark === "done" || day.mark === "frozen") {
      const glyph = day.mark === "done" ? 24 : 22;
      const pixel = Math.max(2, Math.round((spec.dot * glyph) / 34 / 12));
      const gw = 12 * pixel;
      drawMark(
        ctx,
        day.mark === "done" ? CHECK : SNOW,
        cx - gw / 2,
        dotTop + radius - gw / 2,
        pixel,
        day.mark === "done" ? onAccent : ink,
      );
    }
  });

  let cy = weekTop + weekH + 22;
  ctx.beginPath();
  ctx.moveTo(spec.margin + spec.padX, cy);
  ctx.lineTo(spec.margin + spec.padX + textW, cy);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.stroke();

  cy += 20;
  ctx.fillStyle = muted;
  ctx.font = `500 ${spec.message}px ${mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  messageLines.forEach((text, i) => ctx.fillText(text, spec.w / 2, cy + i * spec.message * 1.45));

  cy += messageH + 20;
  ctx.beginPath();
  ctx.moveTo(spec.margin + spec.padX, cy);
  ctx.lineTo(spec.margin + spec.padX + textW, cy);
  ctx.stroke();

  cy += 20;
  const facts: [string, string[]][] = [
    [details.bestLabel, ["Best streak"]],
    [details.limitLabel, ["Breaks or phone", "limit"]],
    [details.freezeLabel, ["Streak freezes"]],
  ];
  const col = textW / 3;
  facts.forEach(([value, labels], i) => {
    const x = spec.margin + spec.padX + col * i + col / 2;
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(spec.margin + spec.padX + col * i, cy);
      ctx.lineTo(spec.margin + spec.padX + col * i, cy + factsH);
      ctx.strokeStyle = line;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = ink;
    ctx.font = `500 ${spec.fact}px ${serif}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(value, x, cy);
    ctx.fillStyle = muted;
    ctx.font = `500 ${spec.factLabel}px ${mono}`;
    labels.forEach((label, li) => ctx.fillText(label, x, cy + spec.fact + 10 + li * (spec.factLabel + 4)));
  });

  ctx.fillStyle = faint;
  ctx.font = `500 ${spec.url}px ${mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("kkorbaczjr.github.io/GoReal-final", spec.w / 2, spec.h - spec.margin * 0.7);
}

/**
 * Draw the streak screen at full resolution (1080 wide), whatever the screen's pixel density is.
 * Rilo sits smaller on the accent's soft colour. The week, sentence and facts match the modal.
 */
export async function generateShareImage({
  details,
  outfit,
  format,
}: {
  details: ShareDetails;
  outfit: ShareOutfit;
  format: ShareFormat;
}): Promise<Blob> {
  const [fonts, rilo] = await Promise.all([loadFonts(), loadSvg(captureRilo(outfit))]);
  const spec = format === "square" ? SQUARE : STORY;
  const canvas = document.createElement("canvas");
  canvas.width = spec.w;
  canvas.height = spec.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw");
  paint(ctx, spec, rilo, details, fonts.serif, fonts.mono);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not draw");
  return blob;
}

export type ShareResult = { kind: "shared" } | { kind: "cancelled" } | { kind: "saved"; copied: boolean };

/** Share the PNG, or save it and copy the app link when the device has no share sheet for files. */
export async function shareImage(blob: Blob, text?: string): Promise<ShareResult> {
  const file = new File([blob], "goreal-streak.png", { type: "image/png" });
  const message = text ?? streakLabel(0);
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: message, url: APP_URL });
      return { kind: "shared" };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return { kind: "cancelled" };
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "goreal-streak.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  let copied = false;
  try {
    await navigator.clipboard.writeText(APP_URL);
    copied = true;
  } catch {
    copied = false;
  }
  return { kind: "saved", copied };
}
