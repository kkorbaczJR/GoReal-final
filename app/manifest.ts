import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/base";

export const dynamic = "force-static";

/** What the phone needs to install GoReal as an app. The PNG icons come from `scripts/pwa/icons.mjs`. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: `${BASE_PATH}/`,
    name: "GoReal",
    short_name: "GoReal",
    description: "Take real breaks from your phone, grow your streak, dress up Rilo.",
    lang: "en",
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["health", "lifestyle", "productivity"],
    icons: [
      { src: `${BASE_PATH}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BASE_PATH}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${BASE_PATH}/icons/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: `${BASE_PATH}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
