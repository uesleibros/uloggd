import { fileURLToPath } from "node:url";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /**
   * The data cache lives in memory, not on disk.
   *
   * Next writes every cached fetch to `.next/cache/fetch-cache` and never
   * removes one, and the catalogue reads IGDB through `unstable_cache`, so the
   * count of entries is the count of distinct queries anybody has ever made.
   * On the host that ran out of container disk, and every render then failed
   * writing the next one.
   *
   * Absolute, because Next records this path relative to the build directory
   * and there is no one relative path that fits all three: `next dev` builds
   * into `.next/dev`, `next build` into `.next`, and the deploy runs from the
   * standalone tree. The packaging script rewrites the recorded value for the
   * server, which is also where the Windows separators are turned around.
   */
  cacheHandler: fileURLToPath(new URL("./cache-handler.js", import.meta.url)),
  // Ours holds the memory, so Next's own copy would be a second one.
  cacheMaxMemorySize: 0,
  experimental: {
    // `app/global-not-found.tsx`: the 404 for a URL no route matches. The
    // site's layout lives under `[lang]`, so without this a dead address under
    // a real segment got Next's own unstyled fallback.
    globalNotFound: true,
  },
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
        // Served from `public/`, so the content type has to be stated: a
        // manifest delivered as application/json or text/plain is ignored, and
        // the only symptom is the install option quietly never appearing.
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json; charset=utf-8",
          },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
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

// The documentation is MDX compiled at build time. Wrapping here rather than
// keeping a second build is what lets one deploy carry both the site and its
// reference.
export default createMDX()(nextConfig);
