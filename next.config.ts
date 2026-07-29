import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:lang/publisher/:slug",
        destination: "/:lang/company/:slug",
        permanent: true,
      },
    ];
  },
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
        hostname: "backloggd.com",
        pathname: "/apple-touch-icon.png",
      },
    ],
  },
};

export default nextConfig;
