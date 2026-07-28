import type { MetadataRoute } from "next";
import { locales } from "@/app/[lang]/dictionaries";
import { SITE_URL } from "@/lib/seo";

// Anything behind a login is noise in an index: it either redirects to /login
// or renders a viewer-specific page that means nothing to a crawler. Paths are
// spelled out per locale on purpose — a wildcard like /*/library would also
// catch /pt-BR/u/someone/library, which is public and worth indexing.
const PRIVATE_TREES = ["auth", "moderation", "onboarding", "settings"];
// Private landing pages whose children are public: /pt-BR/lists is the owner's
// workspace, /pt-BR/lists/<id> is a shareable list.
const PRIVATE_INDEXES = ["library", "lists", "login", "reviews", "suspended"];

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/api/",
    ...locales.flatMap((locale) => [
      ...PRIVATE_TREES.flatMap((segment) => [
        `/${locale}/${segment}$`,
        `/${locale}/${segment}/`,
      ]),
      ...PRIVATE_INDEXES.map((segment) => `/${locale}/${segment}$`),
    ]),
  ];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
