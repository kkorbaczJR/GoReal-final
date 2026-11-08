import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GoReal",
    short_name: "GoReal",
    description: "Take real breaks from your phone, grow your streak, climb the league.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf9f5",
    theme_color: "#faf9f5",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
