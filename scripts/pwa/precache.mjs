// Turns on offline mode for a static build: writes every file of the site, and a version made from their
// contents, into the built service worker (out/sw.js). Run it after `next build` with GOREAL_TARGET=pages:
//   node scripts/pwa/precache.mjs out
// A new version means a changed sw.js, which is how the browser notices there is an update.
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const dir = process.argv[2] ?? "out";
const SKIP = new Set(["sw.js", ".nojekyll"]);

async function walk(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(join(folder, e.name)) : [join(folder, e.name)])),
  );
  return files.flat();
}

/** How the page asks for a file: pages by their folder ("home/"), the start page as "./". */
function address(file) {
  const path = relative(dir, file).split(sep).join("/");
  if (path === "index.html") return "./";
  if (path.endsWith("/index.html")) return path.slice(0, -"index.html".length);
  return path;
}

const files = (await walk(dir)).filter((f) => !SKIP.has(relative(dir, f)) && !f.endsWith(".map")).sort();
const total = createHash("sha256");
let bytes = 0;
for (const f of files) {
  const content = await readFile(f);
  bytes += content.length;
  total.update(address(f)).update(createHash("sha256").update(content).digest());
}
const version = total.digest("hex").slice(0, 12);
const list = files.map(address);

const swPath = join(dir, "sw.js");
const sw = await readFile(swPath, "utf8");
const filled = sw
  .replace('const VERSION = "dev";', `const VERSION = ${JSON.stringify(version)};`)
  .replace("const FILES = /* precache */ [];", `const FILES = ${JSON.stringify(list)};`);
if (filled === sw || !filled.includes(version) || filled.includes("/* precache */")) {
  throw new Error(`${swPath} does not have the VERSION and FILES lines this script fills in`);
}
await writeFile(swPath, filled);
console.log(`offline copy: ${list.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB, version ${version}`);
