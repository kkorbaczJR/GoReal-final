import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [{ source: "/league", destination: "/home", permanent: false }];
  },
};

export default nextConfig;
