import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "placehold.co" }],
  },
  async rewrites() {
    return [{ source: "/orcamento", destination: "/orcamento/index.html" }];
  },
};

export default nextConfig;
