// Makes the PNG app icons in public/icons from app/icon.svg. Run it again after changing the icon:
//   node scripts/pwa/icons.mjs
// - icon-192/512: the normal icon (rounded white tile, see-through corners).
// - maskable-512: a full white square with more room around Rilo. Android cuts it into its own shape (circle,
//   squircle) and only the middle circle, 80% wide, is sure to stay.
// - apple-touch-icon: a full white square too, because iOS rounds the corners itself and turns see-through
//   corners black.
import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile(new URL("../../app/icon.svg", import.meta.url), "utf8");
const square = svg.replace(/(<rect x="-5" y="-6.5" width="26" height="26") rx="[\d.]+"/, "$1");
if (square === svg) throw new Error("Could not find the background tile in app/icon.svg");
const roomy = square
  .replace('viewBox="-5 -6.5 26 26"', 'viewBox="-7 -8.5 30 30"')
  .replace('<rect x="-5" y="-6.5" width="26" height="26"', '<rect x="-7" y="-8.5" width="30" height="30"');

const out = new URL("../../public/icons/", import.meta.url);
await mkdir(out, { recursive: true });

const icons = [
  ["icon-192.png", svg, 192],
  ["icon-512.png", svg, 512],
  ["maskable-512.png", roomy, 512],
  ["apple-touch-icon.png", square, 180],
];

for (const [name, source, size] of icons) {
  await sharp(Buffer.from(source), { density: 72 * Math.ceil(size / 26) })
    .resize(size, size, { kernel: "nearest" })
    .png({ compressionLevel: 9, palette: true })
    .toFile(new URL(name, out).pathname);
  console.log(`public/icons/${name}`);
}
