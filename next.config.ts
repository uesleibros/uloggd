import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Remote providers already serve correctly sized assets. Bypass the
    // hosted /_next/image optimizer so image delivery never depends on a
    // metered optimization quota.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.igdb.com",
        pathname: "/igdb/image/upload/**",
      },
      {
        protocol: "https",
        hostname: "backloggd-avatars.b-cdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "backloggd.com",
        pathname: "/apple-touch-icon.png",
      },
    ],
  },
};

export default nextConfig;
