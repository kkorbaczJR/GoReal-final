"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import Mascot from "@/components/Mascot";
import type { Back, Face, Neck, Outfit } from "@/lib/shop";
import { APP_URL, pickShareLine, streakLabel } from "@/lib/shareCopy";

export type ShareFormat = "story" | "square";

/** Everything Rilo is wearing right now. A null slot means he is not wearing that piece. */
export type ShareOutfit = {
  outfit: Outfit | null;
  face: Face | null;
  neck: Neck | null;
  back: Back | null;
};

const STORY = { w: 1080, h: 1920, title: 84, wellY: 210, wellH: 920, number: 148, label: 36, caption: 40, url: 28 };
const SQUARE = { w: 1080, h: 1080, title: 64, wellY: 132, wellH: 500, number: 92, label: 28, caption: 32, url: 24 };

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
    document.fonts.load(`500 84px ${serif}`).catch(() => undefined),
    document.fonts.load(`italic 500 40px ${serif}`).catch(() => undefined),
    document.fonts.load(`600 36px ${mono}`).catch(() => undefined),
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

type Spec = typeof STORY;

function paint(
  ctx: CanvasRenderingContext2D,
  spec: Spec,
  rilo: HTMLImageElement,
  streak: number,
  caption: string,
  serif: string,
  mono: string,
) {
  const ink = token("--ink", "#111111");
  const ink2 = token("--ink-2", "#333333");
  const muted = token("--muted", "#6e6e6e");
  const soft = token("--soft", "#f4f4f4");
  const line = token("--line", "#ebebeb");
  const accent = token("--accent", "#fc4c02");
  const days = Math.max(0, Math.floor(streak));

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, spec.w, spec.h);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = ink;
  ctx.font = `500 ${spec.title}px ${serif}`;
  ctx.fillText("GoReal", spec.w / 2, spec.wellY - 78);

  const wellX = 84;
  const wellW = spec.w - wellX * 2;
  ctx.beginPath();
  ctx.roundRect(wellX, spec.wellY, wellW, spec.wellH, 56);
  ctx.fillStyle = soft;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = line;
  ctx.stroke();

  const pad = 36;
  const scale = Math.min((wellW - pad * 2) / rilo.naturalWidth, (spec.wellH - pad * 2) / rilo.naturalHeight);
  const dw = rilo.naturalWidth * scale;
  const dh = rilo.naturalHeight * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(rilo, wellX + (wellW - dw) / 2, spec.wellY + (spec.wellH - dh) / 2, dw, dh);

  const pixel = Math.round(spec.number / 14);
  const flameW = 12 * pixel;
  const flameH = 12 * pixel;
  ctx.font = `500 ${spec.number}px ${serif}`;
  const number = String(days);
  const numberW = ctx.measureText(number).width;
  const rowW = flameW + 28 + numberW;
  const rowY = spec.wellY + spec.wellH + (spec === STORY ? 150 : 100);
  const rowX = (spec.w - rowW) / 2;
  drawFlame(ctx, rowX, rowY - flameH / 2, pixel, accent, days === 0);
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.fillText(number, rowX + flameW + 28, rowY);

  ctx.textAlign = "center";
  ctx.fillStyle = days === 0 ? muted : accent;
  ctx.font = `600 ${spec.label}px ${mono}`;
  const labelY = rowY + flameH / 2 + spec.label / 2 + 22;
  ctx.fillText("day streak", spec.w / 2, labelY);

  ctx.fillStyle = ink2;
  ctx.font = `italic 500 ${spec.caption}px ${serif}`;
  const lines = wrap(ctx, caption, spec.w - 180);
  const captionTop = labelY + spec.label / 2 + spec.caption;
  lines.forEach((text, i) => ctx.fillText(text, spec.w / 2, captionTop + i * (spec.caption + 10)));

  ctx.fillStyle = muted;
  ctx.font = `500 ${spec.url}px ${mono}`;
  ctx.fillText("kkorbaczjr.github.io/GoReal-final", spec.w / 2, spec.h - 78);
}

/**
 * Draw the share card at full resolution (1080 wide), whatever the screen's pixel density is.
 * `line` is optional so a format toggle can keep the same caption.
 */
export async function generateShareImage({
  streak,
  outfit,
  format,
  line,
}: {
  streak: number;
  outfit: ShareOutfit;
  format: ShareFormat;
  line?: string;
}): Promise<Blob> {
  const caption = line ?? pickShareLine();
  const [fonts, rilo] = await Promise.all([loadFonts(), loadSvg(captureRilo(outfit))]);
  const spec = format === "square" ? SQUARE : STORY;
  const canvas = document.createElement("canvas");
  canvas.width = spec.w;
  canvas.height = spec.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw");
  paint(ctx, spec, rilo, streak, caption, fonts.serif, fonts.mono);
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
