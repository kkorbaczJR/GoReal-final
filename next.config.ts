import type { NextConfig } from "next";

/**
 * `GOREAL_TARGET=android` builds a static export into `out/` for the Android app (Capacitor serves the files
 * from inside the APK). A static export cannot have redirects or headers, so those only apply to the web build.
 */
const android = process.env.GOREAL_TARGET === "android";

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

const androidConfig: NextConfig = {
  devIndicators: false,
  output: "export",
  trailingSlash: true,
};

export default android ? androidConfig : webConfig;
