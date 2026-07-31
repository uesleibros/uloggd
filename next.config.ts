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
  async headers() {
    return [
      {
        // A stale service worker is the worst kind: it keeps serving its own
        // old rules and cannot be fixed by shipping a new one, because the
        // browser reuses the cached copy of this very file. Never caching it
        // is what makes a bad worker recoverable.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
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
