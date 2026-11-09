import type { NextConfig } from "next";

/**
 * `GOREAL_TARGET=android` builds a static export into `out/` for the Android app (Capacitor serves the files
 * from inside the APK). `GOREAL_TARGET=pages` builds the same export for GitHub Pages, where the site lives
 * under `/<repository name>` (see `NEXT_PUBLIC_BASE_PATH`). A static export cannot have redirects or headers,
 * so those only apply to the normal web build.
 */
const target = process.env.GOREAL_TARGET;
const basePath = target === "pages" ? (process.env.NEXT_PUBLIC_BASE_PATH ?? "") : "";

const webConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [{ source: "/league", destination: "/home", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

const exportConfig: NextConfig = {
  devIndicators: false,
  output: "export",
  trailingSlash: true,
  basePath,
};

export default target === "android" || target === "pages" ? exportConfig : webConfig;
