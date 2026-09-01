import type { Metadata } from "next";
import { locales, type Locale } from "@/app/[lang]/dictionaries";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!siteUrl)
  throw new Error(
    "NEXT_PUBLIC_SITE_URL is required: every canonical, hreflang, sitemap entry and social card is built from it, and an empty origin ships as a silently broken canonical.",
  );

export const SITE_URL = siteUrl.replace(/\/$/, "");

/**
 * The same content lives at /pt-BR, /en and /es. Without a canonical plus the
 * reciprocal hreflang set, a search engine sees three near-duplicate pages and
 * picks one on its own, usually not the one matching the reader's language.
 *
 * `path` is the part after the locale, always starting with "/" ("" for home).
 */
export function localeAlternates(
  lang: Locale,
  path: string,
): Metadata["alternates"] {
  const suffix = path === "/" ? "" : path;
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, `/${locale}${suffix}`]),
  ) as Record<string, string>;
  return {
    canonical: `/${lang}${suffix}`,
    languages: {
      ...languages,
      // Portuguese is the project's primary locale, so it answers for readers
      // whose language matches none of the three.
      "x-default": `/pt-BR${suffix}`,
    },
  };
}

export function socialLocale(lang: Locale) {
  return lang === "pt-BR" ? "pt_BR" : lang === "en" ? "en_US" : "es_ES";
}

type SocialMetadataOptions = {
  lang: Locale;
  path: string;
  title: string;
  description: string;
  type?: "website" | "article" | "profile";
  /** `null` lets a colocated opengraph-image/twitter-image own the field. */
  image?: string | null;
  largeImage?: boolean;
};

/**
 * The complete baseline for an indexable, shareable page.
 *
 * Next replaces nested metadata objects instead of deep-merging them. A page
 * that set only an Open Graph title therefore discarded the layout's URL,
 * locale and image. Keeping the whole bundle here makes canonical, hreflang,
 * Open Graph and Twitter describe the same localized URL every time.
 * Routes with colocated `opengraph-image` and `twitter-image` files pass a
 * null image so Next can inject those dynamic endpoints; every other route
 * gets the branded logo fallback here.
 */
export function socialMetadata({
  lang,
  path,
  title,
  description,
  type = "website",
  // No default. A page that names no image falls through to its generated
  // share card, which is what `opengraph-image.tsx` is for. The old default
  // was the raw logo file, and because an explicit `images` beats a
  // file-based one, it was quietly overriding every card the site drew: the
  // home page unfurled as a square picture of a mark with no words on it.
  image,
  largeImage = false,
}: SocialMetadataOptions): Pick<
  Metadata,
  "alternates" | "openGraph" | "twitter"
> {
  const suffix = path === "/" ? "" : path;
  const url = `/${lang}${suffix}`;
  const socialTitle = title === "uloggd" ? title : `${title} · uloggd`;
  const common = {
    title: socialTitle,
    description,
    siteName: "uloggd",
    url,
    locale: socialLocale(lang),
    ...(image ? { images: [{ url: image }] } : {}),
  };
  const openGraph: NonNullable<Metadata["openGraph"]> =
    type === "article"
      ? { ...common, type: "article" }
      : type === "profile"
        ? { ...common, type: "profile" }
        : { ...common, type: "website" };
  return {
    alternates: localeAlternates(lang, path),
    openGraph,
    twitter: {
      card: largeImage ? "summary_large_image" : "summary",
      title: socialTitle,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

/** Pages that only make sense to their signed-in viewer never belong in SERPs. */
export const privatePageMetadata = {
  robots: { index: false, follow: false },
} satisfies Metadata;

/** JSON-LD, escaped so a name with "</script>" cannot break out of the tag. */
export function jsonLd(data: Record<string, unknown>) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}
